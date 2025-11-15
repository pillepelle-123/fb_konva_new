import { useState } from 'react';
import { Button } from '../../ui/primitives/button';
import { MessageCircle, Plus } from 'lucide-react';
import NewConversationModal from './new-conversation-modal';
import ProfilePicture from '../../features/users/profile-picture';
import { MessagesSquare, BookOpen } from 'lucide-react';
import type { Conversation } from './types';

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

  const formatTime = (timestamp?: string | null) => {
    if (!timestamp) return '';
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
          <MessagesSquare className="h-6 w-6" />
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
          conversations.map((conversation) => {
            const isBookChat = conversation.is_group && Boolean(conversation.book_id);
            const isDisabled = isBookChat && !conversation.active;
            const displayName = isBookChat
              ? conversation.title || (conversation.book_name ? conversation.book_name : 'Book Chat')
              : conversation.direct_partner?.name || 'Conversation';
            const lastMessagePreview = conversation.last_message
              ? conversation.is_group && conversation.last_message_sender_name
                ? `${conversation.last_message_sender_name}: ${conversation.last_message}`
                : conversation.last_message
              : null;

            const handleRowClick = () => {
              if (isDisabled) return;
              onConversationSelect(conversation.id);
            };

            return (
              <div
                key={conversation.id}
                onClick={handleRowClick}
                className={`p-4 border-b transition-colors ${
                  selectedConversation === conversation.id ? 'bg-muted' : 'hover:bg-muted cursor-pointer'
                } ${isDisabled ? 'opacity-70' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-3">
                    {isBookChat ? (
                      <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                        <BookOpen className="h-5 w-5" />
                      </div>
                    ) : (
                      <ProfilePicture
                        name={conversation.direct_partner?.name || 'Friend'}
                        size="sm"
                        userId={conversation.direct_partner?.id}
                      />
                    )}
                    <div>
                      <h3 className="font-medium">{displayName}</h3>
                      {isBookChat && conversation.book_name && (
                        <p className="text-xs text-muted-foreground">Book: {conversation.book_name}</p>
                      )}
                    </div>
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
                    {isDisabled && (
                      <Button
                        variant="outline"
                        size="xs"
                        onClick={(event) => {
                          event.stopPropagation();
                          onConversationSelect(conversation.id);
                        }}
                      >
                        Disabled
                      </Button>
                    )}
                  </div>
                </div>
                {lastMessagePreview && (
                  <p className="text-sm text-muted-foreground truncate">
                    {lastMessagePreview}
                  </p>
                )}
              </div>
            );
          })
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