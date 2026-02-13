import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../../context/auth-context';
import { Link } from 'react-router-dom';
import { MessageCircle, FileDown } from 'lucide-react';
import ProfilePicture from '../users/profile-picture';
import type { Conversation } from './types';
import { useSocket } from '../../../context/socket-context';
import {
  getReadNotificationIds,
  markPdfExportAsRead,
  markAllAsRead
} from '../../../utils/notification-read-storage';

interface NotificationPopoverProps {
  onUpdate: () => void;
  onClose: () => void;
  /** Called when user clicks an entry (notification or "View all"). Use e.g. to close mobile nav menu. */
  onEntryClick?: () => void;
}

interface PDFExportNotification {
  id: number;
  bookId: number;
  bookName: string;
  status: 'completed' | 'failed';
  createdAt: string;
}

export default function NotificationPopover({ onUpdate, onClose, onEntryClick }: NotificationPopoverProps) {
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const [unreadConversations, setUnreadConversations] = useState<Conversation[]>([]);
  const [pdfExportNotifications, setPdfExportNotifications] = useState<PDFExportNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [readVersion, setReadVersion] = useState(0);

  const readIds = user ? getReadNotificationIds(user.id) : { conversationIds: new Set<number>(), pdfExportIds: new Set<number>() };

  const isPdfUnread = useCallback((p: PDFExportNotification) => !readIds.pdfExportIds.has(p.id), [readVersion, readIds.pdfExportIds]);

  useEffect(() => {
    fetchUnreadConversations();
    fetchPDFExportNotifications();
  }, []);

  useEffect(() => {
    if (socket) {
      socket.on('pdf_export_completed', (data: { exportId: number; bookId: number; bookName: string; status: string }) => {
        if (data.status === 'completed') {
          setPdfExportNotifications(prev => [{
            id: data.exportId,
            bookId: data.bookId,
            bookName: data.bookName,
            status: 'completed',
            createdAt: new Date().toISOString()
          }, ...prev]);
          onUpdate();
        }
      });

      return () => {
        socket.off('pdf_export_completed');
      };
    }
  }, [socket, onUpdate]);

  const fetchUnreadConversations = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/messenger/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data: Conversation[] = await response.json();
        const unread = data.filter((conv) => conv.unread_count > 0);
        setUnreadConversations(unread);
      }
    } catch (error) {
      console.error('Error fetching unread conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchPDFExportNotifications = async () => {
    try {
      // Fetch recent completed PDF exports (last 24 hours)
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/pdf-exports/recent`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPdfExportNotifications(
          data
            .filter((exp: any) => exp.status === 'completed')
            .map((exp: any) => ({
              id: exp.id,
              bookId: exp.book_id ?? exp.bookId,
              bookName: exp.book_name ?? exp.bookName ?? '',
              status: exp.status,
              createdAt: exp.created_at ?? exp.createdAt
            }))
        );
      }
    } catch (error) {
      // Silently fail - this is optional
    }
  };

  const markConversationAsReadInPopover = async (conversationId: number) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await fetch(`${apiUrl}/messenger/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchUnreadConversations();
      onUpdate();
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
  };

  const handleMarkPdfAsRead = (pdfId: number) => {
    if (user) {
      markPdfExportAsRead(user.id, pdfId);
      setReadVersion(v => v + 1);
      onUpdate();
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!user) return;
    const convIds = unreadConversations.map(c => c.id);
    const pdfIds = pdfExportNotifications.map(p => p.id);
    markAllAsRead(user.id, convIds, pdfIds);
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
    await Promise.all(
      convIds.map((id) =>
        fetch(`${apiUrl}/messenger/conversations/${id}/read`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        })
      )
    );
    setReadVersion(v => v + 1);
    fetchUnreadConversations();
    fetchPDFExportNotifications();
    onUpdate();
    onClose();
    onEntryClick?.();
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div className="text-muted-foreground">Loading notifications...</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h3>Notifications</h3>
        {(unreadConversations.length > 0 || pdfExportNotifications.some(isPdfUnread)) && (
          <button
            type="button"
            className="text-sm text-primary hover:underline"
            onClick={handleMarkAllAsRead}
          >
            Mark all as read
          </button>
        )}
      </div>
      
      {(unreadConversations.length === 0 && pdfExportNotifications.length === 0) ? (
        <div className="text-center py-8">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">No new notifications</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {[
            ...pdfExportNotifications.map((n) => ({ type: 'pdf' as const, item: n, ts: new Date(n.createdAt || 0).getTime() })),
            ...unreadConversations.map((c) => ({ type: 'conv' as const, item: c, ts: new Date(c.last_message_time || 0).getTime() }))
          ]
            .sort((a, b) => b.ts - a.ts)
            .map((entry) =>
              entry.type === 'pdf' ? (
                <div
                  key={`pdf-${entry.item.id}`}
                  className={`flex items-start gap-2 p-3 rounded-lg transition-colors ${
                    isPdfUnread(entry.item) ? 'bg-highlight/15' : ''
                  } hover:bg-muted`}
                >
                  <button
                    type="button"
                    onClick={(e) => { e.preventDefault(); handleMarkPdfAsRead(entry.item.id); }}
                    className="flex-shrink-0 mt-1.5 h-2 w-2 rounded-full border-0 p-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                    style={{ backgroundColor: isPdfUnread(entry.item) ? 'hsl(var(--highlight))' : 'hsl(var(--muted-foreground))' }}
                    aria-label="Mark as read"
                  />
                  <Link
                    to={`/books/${entry.item.bookId}/export`}
                    onClick={() => { handleMarkPdfAsRead(entry.item.id); onClose(); onEntryClick?.(); }}
                    className="flex-1 min-w-0 flex items-start gap-3"
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <FileDown className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">
                        PDF Ready{entry.item.bookName ? ` – ${entry.item.bookName}` : ''}
                      </p>
                    </div>
                  </Link>
                </div>
              ) : (() => {
                const conversation = entry.item;
                const isGroup = conversation.is_group;
                const partner = conversation.direct_partner;
                const conversationName = isGroup
                  ? conversation.title || conversation.book_name || 'Book Chat'
                  : partner?.name || 'Conversation';
                const senderName = conversation.last_message_sender_name?.trim();
                const avatarLabel = isGroup
                  ? senderName || 'Teilnehmer'
                  : partner?.name || conversationName;
                const avatarUserId = isGroup
                  ? conversation.last_message_sender_id ?? undefined
                  : partner?.id;
                const previewText = conversation.last_message
                  ? isGroup && senderName
                    ? `${senderName}: ${conversation.last_message}`
                    : conversation.last_message
                  : 'Keine Nachrichten';
                const timestampLabel = conversation.last_message_time
                  ? formatTime(conversation.last_message_time)
                  : '';
                const conversationLink = `/messenger?conversationId=${conversation.id}`;

                const isConvUnread = conversation.unread_count > 0;
                return (
                  <div
                    key={`conv-${conversation.id}`}
                    className={`flex items-start gap-2 p-3 rounded-lg transition-colors ${
                      isConvUnread ? 'bg-highlight/15' : ''
                    } hover:bg-muted`}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        if (isConvUnread) markConversationAsReadInPopover(conversation.id);
                      }}
                      className="flex-shrink-0 mt-1.5 h-2 w-2 rounded-full border-0 p-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                      style={{ backgroundColor: isConvUnread ? 'hsl(var(--highlight))' : 'hsl(var(--muted-foreground))' }}
                      aria-label="Mark as read"
                    />
                    <Link
                      to={conversationLink}
                      onClick={() => { markConversationAsReadInPopover(conversation.id); onClose(); onEntryClick?.(); }}
                      className="flex-1 min-w-0 flex items-start gap-3"
                    >
                      <ProfilePicture
                        name={avatarLabel}
                        size="sm"
                        userId={avatarUserId}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm truncate">{conversationName}</span>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-xs text-muted-foreground">
                              {timestampLabel}
                            </span>
                            {conversation.unread_count > 0 && (
                              <div className="bg-highlight text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                                {conversation.unread_count}
                              </div>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {previewText}
                        </p>
                      </div>
                    </Link>
                  </div>
                );
              })()
            )}
        </div>
      )}
    </div>
  );
}