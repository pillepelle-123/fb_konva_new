import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/auth-context';
import { Modal } from '../../ui/overlays/modal';
import { Button } from '../../ui/primitives/button';
import { MessageCircle } from 'lucide-react';
import ProfilePicture from '../../features/users/profile-picture';

interface Friend {
  id: number;
  name: string;
  email: string;
}

interface NewConversationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConversationCreated: () => void;
}

export default function NewConversationModal({
  isOpen,
  onClose,
  onConversationCreated
}: NewConversationModalProps) {
  const { token } = useAuth();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchFriends();
    }
  }, [isOpen]);

  const fetchFriends = async () => {
    try {
      setLoading(true);
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/friendships/friends`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setFriends(data);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const startConversation = async (friendId: number) => {
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
        onConversationCreated();
        onClose();
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start New Conversation">
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">Loading friends...</div>
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p className="text-muted-foreground">No friends found</p>
            <p className="text-sm text-muted-foreground">Add friends to start conversations</p>
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="font-medium">Select a friend to message:</h3>
            {friends.map((friend) => (
              <div
                key={friend.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                onClick={() => startConversation(friend.id)}
              >
                <div className="flex items-center gap-3">
                  <ProfilePicture name={friend.name} size="sm" userId={friend.id} />
                  <div>
                    <p className="font-medium">{friend.name}</p>
                    <p className="text-sm text-muted-foreground">{friend.email}</p>
                  </div>
                </div>
                <Button size="sm" variant="outline">
                  Message
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}