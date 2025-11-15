import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/auth-context';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import ProfilePicture from '../users/profile-picture';
import type { Conversation } from './types';

interface NotificationPopoverProps {
  onUpdate: () => void;
  onClose: () => void;
}

export default function NotificationPopover({ onUpdate, onClose }: NotificationPopoverProps) {
  const { token } = useAuth();
  const [unreadConversations, setUnreadConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUnreadConversations();
  }, []);

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

  const markAsRead = async (conversationId: number) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await fetch(`${apiUrl}/messenger/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      onUpdate();
    } catch (error) {
      console.error('Error marking conversation as read:', error);
    }
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
        <Link 
          to="/messenger" 
          className="text-sm text-primary hover:underline"
          onClick={() => { onUpdate(); onClose(); }}
        >
          View all
        </Link>
      </div>
      
      {unreadConversations.length === 0 ? (
        <div className="text-center py-8">
          <MessageCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm text-muted-foreground">No new messages</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {unreadConversations.map((conversation) => {
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

            return (
            <Link
              key={conversation.id}
              to={conversationLink}
              onClick={() => { markAsRead(conversation.id); onClose(); }}
              className="block p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-start gap-3">
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
                      <div className="bg-highlight text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                        {conversation.unread_count}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {previewText}
                  </p>
                </div>
              </div>
            </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}