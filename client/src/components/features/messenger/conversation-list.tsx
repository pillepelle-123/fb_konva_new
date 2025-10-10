import { useState } from 'react';
import { useAuth } from '../../../context/auth-context';
import { Button } from '../../ui/primitives/button';
import { MessageCircle, Plus } from 'lucide-react';
import NewConversationModal from './new-conversation-modal';
import ProfilePicture from '../../features/users/profile-picture';
import { MessageSquare } from 'lucide-react';

interface Conversation {
  id: number;
  friend_id: number;
  friend_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedConversation: number | null;
  onConversationSelect: (id: number) => void;
  onConversationsUpdate: () => void;
}

export default function ConversationList({
  conversations,
  selectedConversation,
  onConversationSelect,
  onConversationsUpdate
}: ConversationListProps) {
  const [showNewConversation, setShowNewConversation] = useState(false);

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className="h-full flex flex-col ">
      <div className="p-4 border-b flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center space-x-2">
          <MessageSquare className="h-6 w-6" />
          <span>Messenger</span>
        </h1>
        <Button
          size="sm"
          onClick={() => setShowNewConversation(true)}
          className="h-8 w-8 p-0"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No conversations yet</p>
            <p className="text-sm">Start a new conversation with a friend</p>
          </div>
        ) : (
          conversations.map((conversation) => (
            <div
              key={conversation.id}
              onClick={() => onConversationSelect(conversation.id)}
              className={`p-4 border-b cursor-pointer hover:bg-muted transition-colors ${
                selectedConversation === conversation.id ? 'bg-muted' : ''
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-3">
                  <ProfilePicture name={conversation.friend_name} size="sm" userId={conversation.friend_id} />
                  <h3 className="font-medium">{conversation.friend_name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  {conversation.last_message_time && (
                    <span className="text-xs text-muted-foreground">
                      {formatTime(conversation.last_message_time)}
                    </span>
                  )}
                  {conversation.unread_count > 0 && (
                    <div className="bg-highlight text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                      {conversation.unread_count}
                    </div>
                  )}
                </div>
              </div>
              {conversation.last_message && (
                <p className="text-sm text-muted-foreground truncate">
                  {conversation.last_message}
                </p>
              )}
            </div>
          ))
        )}
      </div>
      
      <NewConversationModal
        isOpen={showNewConversation}
        onClose={() => setShowNewConversation(false)}
        onConversationCreated={onConversationsUpdate}
      />
    </div>
  );
}