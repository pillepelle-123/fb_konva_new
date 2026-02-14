import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/auth-context';
import { MessageCircle, FileDown, Check, X } from 'lucide-react';
import ProfilePicture from '../users/profile-picture';
import type { Conversation } from './types';
import { useSocket } from '../../../context/socket-context';
import List from '../../shared/list';
import NotificationEntry from './notification-entry';
import {
  getReadNotificationIds,
  markPdfExportAsRead,
  markPdfExportAsUnread,
  markAllAsRead,
  getHiddenNotificationKeys,
  addHiddenNotificationKeys,
  getReadNotificationKeys,
  toggleReadNotificationKey,
  addReadNotificationKeys
} from '../../../utils/notification-read-storage';

interface NotificationPopoverProps {
  onUpdate: () => void;
  onClose: () => void;
  onEntryClick?: () => void;
}

interface PDFExportNotification {
  id: number;
  bookId: number;
  bookName: string;
  status: 'completed' | 'failed';
  createdAt: string;
}

interface FriendInvitation {
  id: number;
  sender_id: number;
  sender_name: string;
  status: string;
  created_at: string;
  responded_at?: string;
  _source?: 'received' | 'sent';
}

interface ConversationInvitation {
  id: number;
  conversation_id: number;
  inviter_id: number;
  inviter_name: string;
  status: string;
  created_at: string;
  responded_at?: string;
}

type NotificationEntryData =
  | { type: 'pdf'; item: PDFExportNotification; key: string; ts: number }
  | { type: 'conv'; item: Conversation; key: string; ts: number }
  | { type: 'friend_inv'; item: FriendInvitation; key: string; ts: number }
  | { type: 'conv_inv'; item: ConversationInvitation; key: string; ts: number };

const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

const isWithin24Hours = (timestamp: string | null | undefined): boolean => {
  if (timestamp == null || timestamp === '') return false;
  const ts = new Date(timestamp).getTime();
  return Date.now() - ts < TWENTY_FOUR_HOURS_MS;
};

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
  if (diffInHours < 1) return 'Just now';
  if (diffInHours < 24) return `${Math.floor(diffInHours)}h ago`;
  return date.toLocaleDateString();
};

export default function NotificationPopover({ onUpdate, onClose, onEntryClick }: NotificationPopoverProps) {
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const [unreadConversations, setUnreadConversations] = useState<Conversation[]>([]);
  const [pdfExportNotifications, setPdfExportNotifications] = useState<PDFExportNotification[]>([]);
  const [friendInvitations, setFriendInvitations] = useState<FriendInvitation[]>([]);
  const [conversationInvitations, setConversationInvitations] = useState<ConversationInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [readVersion, setReadVersion] = useState(0);
  const [hiddenKeys, setHiddenKeys] = useState<Set<string>>(() =>
    user ? getHiddenNotificationKeys(user.id) : new Set()
  );

  const readIds = user ? getReadNotificationIds(user.id) : { conversationIds: new Set<number>(), pdfExportIds: new Set<number>() };
  const readKeys = user ? getReadNotificationKeys(user.id) : new Set<string>();

  useEffect(() => {
    if (user) setHiddenKeys(getHiddenNotificationKeys(user.id));
  }, [user?.id]);

  const hideNotification = (key: string) => {
    if (user) {
      addHiddenNotificationKeys(user.id, [key]);
      setHiddenKeys((prev) => new Set(prev).add(key));
    }
    onUpdate();
  };

  const handleDeleteAll = () => {
    const allKeys = [
      ...pdfExportNotifications.map((n) => `pdf-${n.id}`),
      ...unreadConversations.map((c) => `conv-${c.id}`),
      ...friendInvitations.map((fi) => `friend_inv-${fi.id}`),
      ...conversationInvitations.map((ci) => `conv_inv-${ci.id}`)
    ];
    if (user) {
      addHiddenNotificationKeys(user.id, allKeys);
      setHiddenKeys((prev) => new Set([...prev, ...allKeys]));
    }
    onUpdate();
  };

  const isPdfUnread = useCallback((p: PDFExportNotification) => !readIds.pdfExportIds.has(p.id), [readVersion, readIds.pdfExportIds]);

  const togglePdfRead = (pdfId: number) => {
    if (!user) return;
    if (readIds.pdfExportIds.has(pdfId)) {
      markPdfExportAsUnread(user.id, pdfId);
    } else {
      markPdfExportAsRead(user.id, pdfId);
    }
    setReadVersion((v) => v + 1);
    onUpdate();
  };

  const toggleFriendInvRead = (key: string) => {
    if (user) toggleReadNotificationKey(user.id, key);
    setReadVersion((v) => v + 1);
    onUpdate();
  };

  const toggleConvInvRead = (key: string) => {
    if (user) toggleReadNotificationKey(user.id, key);
    setReadVersion((v) => v + 1);
    onUpdate();
  };

  useEffect(() => {
    fetchUnreadConversations();
    fetchPDFExportNotifications();
    fetchFriendInvitations();
    fetchConversationInvitations();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('pdf_export_completed', (data: { exportId: number; bookId: number; bookName: string; status: string }) => {
        if (data.status === 'completed') {
          setPdfExportNotifications((prev) => [{
            id: data.exportId,
            bookId: data.bookId,
            bookName: data.bookName,
            status: 'completed',
            createdAt: new Date().toISOString()
          }, ...prev]);
          onUpdate();
        }
      });
      socket.on('friend_invitation_received', () => { fetchFriendInvitations(); onUpdate(); });
      socket.on('friend_invitation_responded', () => { fetchFriendInvitations(); onUpdate(); });
      socket.on('conversation_invitation_received', () => { fetchConversationInvitations(); onUpdate(); });
      socket.on('conversation_invitation_responded', () => {
        fetchConversationInvitations();
        fetchUnreadConversations();
        onUpdate();
      });
      return () => {
        socket.off('pdf_export_completed');
        socket.off('friend_invitation_received');
        socket.off('friend_invitation_responded');
        socket.off('conversation_invitation_received');
        socket.off('conversation_invitation_responded');
      };
    }
  }, [socket, onUpdate]);

  const fetchFriendInvitations = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const [receivedRes, sentRes] = await Promise.all([
        fetch(`${apiUrl}/friend-invitations/received/all`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${apiUrl}/friend-invitations/sent`, { headers: { Authorization: `Bearer ${token}` } })
      ]);
      const received = receivedRes.ok ? await receivedRes.json() : [];
      const sent = sentRes.ok ? await sentRes.json() : [];
      const receivedMapped = received.map((r: FriendInvitation) => ({ ...r, _source: 'received' as const }));
      const sentMapped = sent
        .filter((s: { status: string }) => s.status !== 'pending')
        .map((s: { id: number; receiver_id: number; receiver_name: string; status: string; created_at: string; responded_at?: string }) => ({
          id: s.id,
          sender_id: s.receiver_id,
          sender_name: s.receiver_name,
          status: s.status,
          created_at: s.responded_at || s.created_at,
          responded_at: s.responded_at,
          _source: 'sent' as const
        }));
      setFriendInvitations([...receivedMapped, ...sentMapped]);
    } catch { /* ignore */ }
  };

  const fetchConversationInvitations = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/messenger/conversation-invitations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setConversationInvitations(data);
      }
    } catch { /* ignore */ }
  };

  const handleRespondToConversationInvitation = async (invitationId: number, accepted: boolean) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const res = await fetch(`${apiUrl}/messenger/conversation-invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accepted })
      });
      if (res.ok) {
        fetchConversationInvitations();
        fetchUnreadConversations();
        onUpdate();
      }
    } catch { /* ignore */ }
  };

  const handleRespondToInvitation = async (invitationId: number, accepted: boolean) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await fetch(`${apiUrl}/friend-invitations/${invitationId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accepted })
      });
      fetchFriendInvitations();
      onUpdate();
    } catch { /* ignore */ }
  };

  const fetchUnreadConversations = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/messenger/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data: Conversation[] = await response.json();
        const relevant = data.filter(
          (conv) =>
            conv.unread_count > 0 ||
            isWithin24Hours(conv.last_message_time)
        );
        setUnreadConversations(relevant);
      }
    } catch (error) {
      console.error('Error fetching unread conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPDFExportNotifications = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/pdf-exports/recent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setPdfExportNotifications(
          data
            .filter((exp: { status: string }) => exp.status === 'completed')
            .map((exp: { id: number; book_id?: number; bookId?: number; book_name?: string; bookName?: string; status: string; created_at?: string; createdAt?: string }) => ({
              id: exp.id,
              bookId: exp.book_id ?? exp.bookId,
              bookName: exp.book_name ?? exp.bookName ?? '',
              status: exp.status,
              createdAt: exp.created_at ?? exp.createdAt
            }))
        );
      }
    } catch { /* ignore */ }
  };

  const markConversationAsReadInPopover = async (conversationId: number) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await fetch(`${apiUrl}/messenger/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      setUnreadConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unread_count: 0 } : c))
      );
      onUpdate();
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  const markConversationAsUnreadInPopover = async (conversationId: number) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await fetch(`${apiUrl}/messenger/conversations/${conversationId}/unread`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const response = await fetch(`${apiUrl}/messenger/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data: Conversation[] = await response.json();
        const relevant = data.filter(
          (conv) =>
            conv.unread_count > 0 ||
            isWithin24Hours(conv.last_message_time)
        );
        setUnreadConversations(relevant);
      }
      onUpdate();
    } catch (error) {
      console.error('Error marking conversation as unread:', error);
    }
  };

  const toggleConvRead = (conversationId: number) => {
    const conv = unreadConversations.find((c) => c.id === conversationId);
    if (!conv) return;
    if (conv.unread_count > 0) {
      markConversationAsReadInPopover(conversationId);
    } else {
      markConversationAsUnreadInPopover(conversationId);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    const convIds = unreadConversations.map((c) => c.id);
    const pdfIds = pdfExportNotifications.map((p) => p.id);
    const readKeysToAdd = [
      ...friendInvitations.map((fi) => `friend_inv-${fi.id}`),
      ...conversationInvitations.map((ci) => `conv_inv-${ci.id}`)
    ];
    markAllAsRead(user.id, convIds, pdfIds);
    addReadNotificationKeys(user.id, readKeysToAdd);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    await Promise.all(
      convIds.map((id) =>
        fetch(`${apiUrl}/messenger/conversations/${id}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      )
    );
    setReadVersion((v) => v + 1);
    fetchUnreadConversations();
    fetchPDFExportNotifications();
    onUpdate();
  };

  const allEntries: NotificationEntryData[] = [
    ...pdfExportNotifications
      .filter((n) => isWithin24Hours(n.createdAt))
      .map((n) => ({
        type: 'pdf' as const,
        item: n,
        ts: new Date(n.createdAt || 0).getTime(),
        key: `pdf-${n.id}`
      })),
    ...unreadConversations.map((c) => ({
      type: 'conv' as const,
      item: c,
      ts: new Date(c.last_message_time || 0).getTime(),
      key: `conv-${c.id}`
    })),
    ...friendInvitations
      .filter((fi) => isWithin24Hours(fi.created_at))
      .map((fi) => ({
        type: 'friend_inv' as const,
        item: fi,
        ts: new Date(fi.created_at || 0).getTime(),
        key: `friend_inv-${fi.id}`
      })),
    ...conversationInvitations
      .filter((ci) => isWithin24Hours(ci.created_at))
      .map((ci) => ({
        type: 'conv_inv' as const,
        item: ci,
        ts: new Date(ci.created_at || 0).getTime(),
        key: `conv_inv-${ci.id}`
      }))
  ];

  const visibleEntries = allEntries
    .filter((entry) => !hiddenKeys.has(entry.key))
    .sort((a, b) => b.ts - a.ts);

  const hasUnread = unreadConversations.length > 0 || pdfExportNotifications.some(isPdfUnread);
  const hasVisible = visibleEntries.length > 0;

  const renderEntry = (entry: NotificationEntryData) => {
    const onHide = () => hideNotification(entry.key);
    const handleLinkClick = () => {
      onClose();
      onEntryClick?.();
    };

    if (entry.type === 'pdf') {
      const isUnread = isPdfUnread(entry.item);
      const timestampLabel = entry.item.createdAt ? formatTime(entry.item.createdAt) : '';
      return (
        <NotificationEntry
          key={entry.key}
          icon={<FileDown className="h-5 w-5 text-primary" />}
          title={entry.item.bookName || 'Book'}
          subtitle={`${timestampLabel}${timestampLabel ? ' · ' : ''}PDF Export Ready`}
          linkTo={`/books/${entry.item.bookId}/export`}
          onLinkClick={() => {
            if (isUnread) markPdfExportAsRead(user!.id, entry.item.id);
            handleLinkClick();
          }}
          onHide={onHide}
          isUnread={isUnread}
          onToggleRead={() => togglePdfRead(entry.item.id)}
        />
      );
    }

    if (entry.type === 'conv_inv') {
      const inv = entry.item;
      const isUnread = !readKeys.has(entry.key);
      const title =
        inv.status === 'pending'
          ? `${inv.inviter_name} wants to start a conversation`
          : inv.status === 'accepted'
            ? `You accepted the chat invitation from ${inv.inviter_name}`
            : `You declined the chat invitation from ${inv.inviter_name}`;
      return (
        <NotificationEntry
          key={entry.key}
          icon={<ProfilePicture name={inv.inviter_name} size="sm" userId={inv.inviter_id} />}
          title={title}
          linkTo={`/messenger?conversationId=${inv.conversation_id}`}
          onLinkClick={handleLinkClick}
          onHide={onHide}
          isUnread={isUnread}
          onToggleRead={() => toggleConvInvRead(entry.key)}
          actions={
            inv.status === 'pending' ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  className="p-1.5 rounded-md hover:bg-muted text-green-600"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRespondToConversationInvitation(inv.id, true);
                  }}
                  aria-label="Accept"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-md hover:bg-muted text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRespondToConversationInvitation(inv.id, false);
                  }}
                  aria-label="Decline"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : undefined
          }
        />
      );
    }

    if (entry.type === 'friend_inv') {
      const inv = entry.item;
      const isUnread = !readKeys.has(entry.key);
      const title =
        inv.status === 'pending'
          ? `${inv.sender_name} wants to add you as a friend`
          : inv._source === 'sent'
            ? inv.status === 'accepted'
              ? `${inv.sender_name} accepted your invitation`
              : `${inv.sender_name} declined your invitation`
            : inv.status === 'accepted'
              ? `You accepted the invitation from ${inv.sender_name}`
              : `You declined the invitation from ${inv.sender_name}`;
      return (
        <NotificationEntry
          key={entry.key}
          icon={<ProfilePicture name={inv.sender_name} size="sm" userId={inv.sender_id} />}
          title={title}
          linkTo={`/profile/${inv.sender_id}`}
          onLinkClick={handleLinkClick}
          onHide={onHide}
          isUnread={isUnread}
          onToggleRead={() => toggleFriendInvRead(entry.key)}
          actions={
            inv.status === 'pending' ? (
              <div className="flex gap-1">
                <button
                  type="button"
                  className="p-1.5 rounded-md hover:bg-muted text-green-600"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRespondToInvitation(inv.id, true);
                  }}
                  aria-label="Accept"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-md hover:bg-muted text-destructive"
                  onClick={(e) => {
                    e.preventDefault();
                    handleRespondToInvitation(inv.id, false);
                  }}
                  aria-label="Decline"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : undefined
          }
        />
      );
    }

    // conv
    const conv = entry.item;
    const isGroup = conv.is_group;
    const partner = conv.direct_partner;
    const conversationName = isGroup
      ? conv.title || conv.book_name || 'Book Chat'
      : partner?.name || 'Conversation';
    const senderName = conv.last_message_sender_name?.trim();
    const avatarLabel = isGroup ? senderName || 'Participant' : partner?.name || conversationName;
    const avatarUserId = isGroup ? conv.last_message_sender_id ?? undefined : partner?.id;
    const previewText = conv.last_message
      ? isGroup && senderName
        ? `${senderName}: ${conv.last_message}`
        : conv.last_message
      : 'No messages';
    const timestampLabel = conv.last_message_time ? formatTime(conv.last_message_time) : '';
    const isConvUnread = conv.unread_count > 0;

    return (
      <NotificationEntry
        key={entry.key}
        icon={<ProfilePicture name={avatarLabel} size="sm" userId={avatarUserId} />}
        title={conversationName}
        subtitle={`${timestampLabel}${timestampLabel ? ' · ' : ''}${previewText}`}
        linkTo={`/messenger?conversationId=${conv.id}`}
        onLinkClick={() => {
          if (isConvUnread) markConversationAsReadInPopover(conv.id);
          handleLinkClick();
        }}
        onHide={onHide}
        isUnread={isConvUnread}
        onToggleRead={() => toggleConvRead(conv.id)}
        badge={conv.unread_count > 0 ? conv.unread_count : undefined}
      />
    );
  };

  if (loading) {
    return (
      <div className="p-6 text-center">
        <div className="text-muted-foreground text-sm">Loading notifications…</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-3">
        {hasUnread && hasVisible && (
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={handleMarkAllAsRead}
          >
            Mark all as read
          </button>
        )}
        {hasVisible && (
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            onClick={handleDeleteAll}
          >
            Delete all
          </button>
        )}
      </div>

      {!hasVisible ? (
        <div className="text-center py-10">
          <MessageCircle className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p className="text-sm text-muted-foreground">No new notifications</p>
        </div>
      ) : (
        <List
          items={visibleEntries}
          renderItem={renderEntry}
          keyExtractor={(e) => e.key}
          variant="notifications"
        />
      )}
    </div>
  );
}
