import { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-context';
import { useSearchParams } from 'react-router-dom';
import ConversationList from '../../components/features/messenger/conversation-list';
import ChatWindow from '../../components/features/messenger/chat-window';

interface Conversation {
  id: number;
  friend_id: number;
  friend_name: string;
  last_message: string;
  last_message_time: string;
  unread_count: number;
}

export default function MessengerPage() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [shouldFocusInput, setShouldFocusInput] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    const friendId = searchParams.get('friendId');
    if (friendId && !loading) {
      const conversation = conversations.find(c => c.friend_id === parseInt(friendId));
      if (conversation) {
        setSelectedConversation(conversation.id);
        setShouldFocusInput(true);
      } else {
        // Create new conversation if it doesn't exist
        createConversation(parseInt(friendId));
      }
    }
  }, [searchParams, conversations, loading]);

  const fetchConversations = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/messenger/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConversationSelect = (conversationId: number) => {
    setSelectedConversation(conversationId);
  };

  const createConversation = async (friendId: number) => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/messenger/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ friendId })
      });
      
      if (response.ok) {
        const newConversation = await response.json();
        setSelectedConversation(newConversation.id);
        fetchConversations();
        setShouldFocusInput(true);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-muted-foreground">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex">
      <div className="w-1/3 border-r">
        <ConversationList
          conversations={conversations}
          selectedConversation={selectedConversation}
          onConversationSelect={handleConversationSelect}
          onConversationsUpdate={fetchConversations}
        />
      </div>
      <div className="flex-1">
        {selectedConversation ? (
          <ChatWindow
            conversationId={selectedConversation}
            onMessageSent={fetchConversations}
            shouldFocusInput={shouldFocusInput}
            onInputFocused={() => setShouldFocusInput(false)}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Select a conversation to start messaging
          </div>
        )}
      </div>
    </div>
  );
}