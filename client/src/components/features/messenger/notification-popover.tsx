import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/auth-context';
import { Link } from 'react-router-dom';
import { MessageCircle } from 'lucide-react';
import ProfilePicture from '../users/profile-picture';

interface UnreadConversation {
  id: number;
  friend_id: number;
  friend_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface NotificationPopoverProps {
  onUpdate: () => void;
  onClose: () => void;
}

export default function NotificationPopover({ onUpdate, onClose }: NotificationPopoverProps) {
  const { token } = useAuth();
  const [unreadConversations, setUnreadConversations] = useState<UnreadConversation[]>([]);
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
        const data = await response.json();
        const unread = data.filter((conv: UnreadConversation) => conv.unread_count > 0);
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
          {unreadConversations.map((conversation) => (
            <Link
              key={conversation.id}
              to={`/messenger?friendId=${conversation.friend_id}`}
              onClick={() => { markAsRead(conversation.id); onClose(); }}
              className="block p-3 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-start gap-3">
                <ProfilePicture 
                  name={conversation.friend_name} 
                  size="sm" 
                  userId={conversation.friend_id}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-medium text-sm truncate">{conversation.friend_name}</span>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-muted-foreground">
                        {formatTime(conversation.last_message_time)}
                      </span>
                      <div className="bg-highlight text-white text-xs rounded-full h-4 w-4 flex items-center justify-center">
                        {conversation.unread_count}
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {conversation.last_message}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}