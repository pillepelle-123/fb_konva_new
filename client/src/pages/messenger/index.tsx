import { useState, useEffect } from 'react';
import { useAuth } from '../../context/auth-context';
import { useSearchParams } from 'react-router-dom';
import ConversationList from '../../components/features/messenger/conversation-list';
import ChatWindow from '../../components/features/messenger/chat-window';
import type { Conversation } from '../../components/features/messenger/types';

export default function MessengerPage() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [shouldFocusInput, setShouldFocusInput] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [archivedFilter, setArchivedFilter] = useState(false);

  useEffect(() => {
    fetchConversations();
  }, [archivedFilter]);

  useEffect(() => {
    if (loading) return;

    const conversationIdParam = searchParams.get('conversationId');
    if (conversationIdParam) {
      const parsedConversationId = parseInt(conversationIdParam, 10);
      if (!Number.isNaN(parsedConversationId)) {
        const conversation = conversations.find((c) => c.id === parsedConversationId);
        if (conversation) {
          setSelectedConversation(conversation.id);
          setShouldFocusInput(true);
          return;
        }
      }
    }

    const friendId = searchParams.get('friendId');
    if (friendId) {
      const parsedId = parseInt(friendId, 10);
      if (Number.isNaN(parsedId)) return;

      const conversation = conversations.find(
        (c) => !c.is_group && c.direct_partner?.id === parsedId
      );
      if (conversation) {
        setSelectedConversation(conversation.id);
        setShouldFocusInput(true);
      } else {
        // Create new conversation if it doesn't exist
        createConversation(parsedId);
      }
    }
  }, [searchParams, conversations, loading]);

  const fetchConversations = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const url = `${apiUrl}/messenger/conversations${archivedFilter ? '?archived=true' : ''}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await response.json();
          setConversations(data);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const handleArchivedFilterChange = (archived: boolean) => {
    setArchivedFilter(archived);
    setLoading(true);
  };

  const handleConversationSelect = (conversationId: number) => {
    setSelectedConversation(conversationId);
  };

  const handleNewConversationCreated = (conversationId: number) => {
    setSelectedConversation(conversationId);
    setShouldFocusInput(true);
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
        setSelectedConversation(newConversation.conversationId);
        fetchConversations();
        setShouldFocusInput(true);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[200px]">
        <div className="text-muted-foreground">Loading conversations...</div>
      </div>
    );
  }

  return (
    <div className="container h-full flex mx-auto min-h-0">
      {/* Mobile: Toggle between list and chat view */}
      <div className="md:hidden flex-1 flex flex-col min-h-0 h-full">
        {selectedConversation ? (
          <div className="flex-1 flex flex-col min-h-0">
            <ChatWindow
              conversationId={selectedConversation}
              conversationMeta={conversations.find(c => c.id === selectedConversation) || undefined}
              onMessageSent={fetchConversations}
              shouldFocusInput={shouldFocusInput}
              onInputFocused={() => setShouldFocusInput(false)}
              onBackToConversations={() => setSelectedConversation(null)}
            />
          </div>
        ) : (
          <ConversationList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onConversationSelect={handleConversationSelect}
            onConversationsUpdate={fetchConversations}
            onNewConversationCreated={handleNewConversationCreated}
            archivedFilter={archivedFilter}
            onArchivedFilterChange={handleArchivedFilterChange}
          />
        )}
      </div>

      {/* Desktop: Side-by-side layout */}
      <div className="hidden md:flex flex-1 min-h-0 h-full">
        <div className="w-1/3 min-w-0 border-r flex flex-col">
          <ConversationList
            conversations={conversations}
            selectedConversation={selectedConversation}
            onConversationSelect={handleConversationSelect}
            onConversationsUpdate={fetchConversations}
            onNewConversationCreated={handleNewConversationCreated}
            archivedFilter={archivedFilter}
            onArchivedFilterChange={handleArchivedFilterChange}
          />
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          {selectedConversation ? (
            <ChatWindow
              conversationId={selectedConversation}
              conversationMeta={conversations.find(c => c.id === selectedConversation) || undefined}
              onMessageSent={fetchConversations}
              shouldFocusInput={shouldFocusInput}
              onInputFocused={() => setShouldFocusInput(false)}
            />
          ) : (
            <div className="flex items-center justify-center flex-1 text-muted-foreground">
              Select a conversation to start messaging
            </div>
          )}
        </div>
      </div>
    </div>
  );
}