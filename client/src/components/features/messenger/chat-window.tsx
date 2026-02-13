import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../../../context/auth-context';
import { useSocket } from '../../../context/socket-context';
import { Button } from '../../ui/primitives/button';
import { Send, ChevronLeft } from 'lucide-react';
import ProfilePicture from '../../features/users/profile-picture';
import type { Conversation } from './types';

interface Message {
  id: number | string;
  content: string;
  created_at: string;
  sender_id: number;
  sender_name: string;
  is_read: boolean;
}

interface ChatWindowProps {
  conversationId: number;
  conversationMeta?: Conversation;
  onMessageSent: () => void;
  shouldFocusInput?: boolean;
  onInputFocused?: () => void;
  variant?: 'default' | 'embedded';
  /** Callback to return to conversation list (mobile only). When provided, shows a back button. */
  onBackToConversations?: () => void;
}

export default function ChatWindow({
  conversationId,
  conversationMeta,
  onMessageSent,
  shouldFocusInput,
  onInputFocused,
  variant = 'default',
  onBackToConversations
}: ChatWindowProps) {
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const isBookChat = Boolean(conversationMeta?.is_group && conversationMeta.book_id);
  const isChatDisabled = isBookChat && conversationMeta?.active === false;
  const isEmbedded = variant === 'embedded';

  const [typingUsers, setTypingUsers] = useState<number[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const tempIdCounter = useRef(0);

  useEffect(() => {
    if (shouldFocusInput && inputRef.current) {
      inputRef.current.focus();
      onInputFocused?.();
    }
  }, [shouldFocusInput, onInputFocused]);

  const fetchMessages = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/messenger/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setMessages(data);
        }
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  }, [conversationId, token]);

  const markAsRead = useCallback(async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      await fetch(`${apiUrl}/messenger/conversations/${conversationId}/read`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
    } catch (error) {
      console.error('Error marking messages as read:', error);
    }
  }, [conversationId, token]);

  useEffect(() => {
    fetchMessages();
    markAsRead();
    
    if (socket) {
      socket.emit('join_conversation', conversationId);
      
      const handleNewMessage = (message: Message) => {
        if (message.sender_id === user?.id) {
          return;
        }
        
        setMessages(prev => {
          if (prev.some(msg => msg.id === message.id)) {
            return prev;
          }
          return [...prev, message];
        });
        markAsRead();
        onMessageSent();
      };
      
      const handleTyping = ({ userId, isTyping }: { userId: number; isTyping: boolean }) => {
        setTypingUsers(prev => {
          if (isTyping) {
            return prev.includes(userId) ? prev : [...prev, userId];
          } else {
            return prev.filter(id => id !== userId);
          }
        });
      };
      
      socket.on('new_message', handleNewMessage);
      socket.on('user_typing', handleTyping);
      
      return () => {
        socket.emit('leave_conversation', conversationId);
        socket.off('new_message', handleNewMessage);
        socket.off('user_typing', handleTyping);
      };
    }
  }, [conversationId, socket, fetchMessages, markAsRead, onMessageSent, user?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isChatDisabled) return;

    const messageContent = newMessage;
    setNewMessage('');

    // Optimistic update - add message immediately
    const tempId = `temp-${++tempIdCounter.current}`;
    const optimisticMessage: Message = {
      id: tempId,
      content: messageContent,
      created_at: new Date().toISOString(),
      sender_id: user?.id || 0,
      sender_name: user?.name || '',
      is_read: true
    };
    setMessages(prev => [...prev, optimisticMessage]);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/messenger/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ content: messageContent })
      });

      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const savedMessage = await response.json();
          // Replace optimistic message with real message
          setMessages(prev => prev.map(msg => 
            msg.id === optimisticMessage.id ? savedMessage : msg
          ));
        }
        onMessageSent();
      } else {
        // Remove optimistic message on error
        setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
        setNewMessage(messageContent); // Restore message text
      }
    } catch (error) {
      console.error('Error sending message:', error);
      // Remove optimistic message on error
      setMessages(prev => prev.filter(msg => msg.id !== optimisticMessage.id));
      setNewMessage(messageContent); // Restore message text
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleTyping = () => {
    if (socket) {
      socket.emit('typing', { conversationId, isTyping: true });
      
      // Clear previous timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Stop typing after 2 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        socket.emit('typing', { conversationId, isTyping: false });
      }, 2000);
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading messages...</div>
      </div>
    );
  }

  const displayName = conversationMeta?.is_group
    ? (conversationMeta.title || conversationMeta.book_name || 'Group Chat')
    : (conversationMeta?.direct_partner?.name || 'Conversation');

  return (
    <div className="h-full flex flex-col">
      {/* Mobile: Back button header to return to conversation list */}
      {onBackToConversations && (
        <div className="md:hidden flex items-center gap-2 px-4 py-3 border-b bg-background">
          <Button
            variant="ghost"
            size="sm"
            onClick={onBackToConversations}
            className="shrink-0 -ml-2"
            aria-label="Back to conversations"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">{displayName}</p>
            {conversationMeta?.is_group && conversationMeta.book_name && (
              <p className="text-xs text-muted-foreground truncate">Book: {conversationMeta.book_name}</p>
            )}
          </div>
          {isChatDisabled && (
            <span className="text-xs font-semibold text-destructive uppercase shrink-0">Disabled</span>
          )}
        </div>
      )}
      {conversationMeta?.is_group && !onBackToConversations && (
        <div className="px-4 py-3 border-b bg-muted/50 flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold">
              {conversationMeta.title || (conversationMeta.book_name ? conversationMeta.book_name : 'Group Chat')}
            </p>
            {conversationMeta.book_name && (
              <p className="text-xs text-muted-foreground">
                Book: {conversationMeta.book_name}
              </p>
            )}
          </div>
          {isChatDisabled && (
            <span className="text-xs font-semibold text-destructive uppercase">Disabled</span>
          )}
        </div>
      )}
      <div className={`flex-1 overflow-y-auto ${isEmbedded ? 'space-y-2' : 'p-4 space-y-4'}`}>
        {messages.map((message, index) => (
          <div
            key={`${message.id}-${index}`}
            className={`flex items-end gap-2 ${message.sender_id === user?.id ? 'justify-end' : 'justify-start'}`}
          >
            {message.sender_id !== user?.id && (
              <ProfilePicture
                name={message.sender_name || 'User'}
                size={isEmbedded ? 'xs' : 'sm'}
                userId={message.sender_id}
              />
            )}
            <div
              className={`rounded-2xl ${isEmbedded ? 'max-w-xs lg:max-w-sm px-3 py-1.5' : 'max-w-xs lg:max-w-md px-4 py-2'} ${
                message.sender_id === user?.id
                  ? 'bg-primary text-primary-foreground rounded-br-none'
                  : 'bg-muted rounded-bl-none'
              }`}
            >
              <p className={isEmbedded ? 'text-xs' : 'text-sm'}>{message.content}</p>
              <p
                className={`${isEmbedded ? 'text-[10px] mt-0.5' : 'text-xs mt-1'} ${
                  message.sender_id === user?.id
                    ? 'text-primary-foreground/70'
                    : 'text-muted-foreground'
                }`}
              >
                {formatTime(message.created_at)}
              </p>
            </div>
            {message.sender_id === user?.id && (
              <ProfilePicture
                name={user?.name || 'You'}
                size={isEmbedded ? 'xs' : 'sm'}
                userId={user?.id}
              />
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={sendMessage} className={isEmbedded ? 'border-t pt-2' : 'p-3 border-t'}>
        <div className={`flex ${isEmbedded ? 'gap-0' : 'gap-2'}`}>
          <input
            ref={inputRef}
            type="text"
            value={newMessage}
            onChange={(e) => {
              setNewMessage(e.target.value);
              handleTyping();
            }}
            placeholder="Type a message..."
            className={`flex-1 border disabled:opacity-60 ${
              isEmbedded
                ? 'px-1 py-1 text-sm rounded-l-md rounded-r-none focus:outline-none focus:ring-0 focus:ring-transparent'
                : 'px-3 py-1 rounded-md focus:outline-none focus:ring-2 focus:ring-primary'
            }`}
            disabled={isChatDisabled}
          />
          <Button
            type="submit"
            size={isEmbedded ? 'xs' : 'sm'}
            className={`${isEmbedded ? 'px-2 rounded-l-none rounded-r-md' : 'px-3'}`}
            disabled={isChatDisabled}
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {isChatDisabled && (
          <p className="text-xs text-muted-foreground mt-2">
            This chat is disabled because the book is archived. You can still read past messages.
          </p>
        )}
        {typingUsers.length > 0 && (
          <div className="px-4 py-2 text-xs text-muted-foreground">
            Someone is typing...
          </div>
        )}
      </form>
    </div>
  );
}