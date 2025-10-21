import { useState, useEffect } from 'react';
import { useAuth } from '../../../context/auth-context';
import { Button } from '../../ui/primitives/button';
import { Badge } from '../../ui/composites/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../../ui/overlays/dialog';
import ProfilePicture from './profile-picture';
import BooksList from '../books/book-list';
import { MessageCircle, Heart } from 'lucide-react';

interface User {
  id: number;
  name: string;
  email: string;
  role: string;
  created_at: string;
}

interface Book {
  id: number;
  name: string;
  pageSize: string;
  orientation: string;
  pageCount: number;
  collaboratorCount: number;
  isOwner: boolean;
  created_at: string;
  updated_at: string;
}

interface ProfileDialogProps {
  userId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ProfileDialog({ userId, open, onOpenChange }: ProfileDialogProps) {
  const { token, user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [sharedBooks, setSharedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && userId) {
      fetchUserProfile();
      fetchSharedBooks();
    }
  }, [open, userId]);

  const fetchUserProfile = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setUser(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchSharedBooks = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/users/${userId}/shared-books`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSharedBooks(data);
      }
    } catch (error) {
      console.error('Error fetching shared books:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user && !loading) return null;

  const isOwnProfile = currentUser?.id === user?.id;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Profile</DialogTitle>
          <DialogDescription>
            View user profile information and shared books
          </DialogDescription>
        </DialogHeader>
        
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        ) : user ? (
          <div className="space-y-6">
            <div className="flex items-start space-x-6">
              <ProfilePicture name={user.name} size="lg" userId={user.id} />
              <div className="flex-1 space-y-4">
                <div>
                  <h2 className="font-bold">{user.name}</h2>
                  <p className="text-muted-foreground">{user.email}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {/* {user.role} •  */}
                    Member since {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
                
                {isOwnProfile ? (
                  <div className="space-y-2">
                    <Badge variant="highlight" >This is you</Badge>
                    {/* <Button variant="outline" size="sm">
                      Your books
                    </Button> */}
                  </div>
                ) : (
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" className="space-x-2">
                      <MessageCircle className="h-4 w-4" />
                      <span>Message</span>
                    </Button>
                    <Button variant="outline" size="sm" className="space-x-2">
                      <Heart className="h-4 w-4" />
                      <span>Add to Favorites</span>
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {sharedBooks.length > 0 && !isOwnProfile && (
              <div className="space-y-4">
                <h3 className="text-lg">
                  Books shared with {user.name}
                </h3>
                <BooksList books={sharedBooks} />
              </div>
            )}

            {sharedBooks.length === 0 && !isOwnProfile && (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  You don't have any shared books with {user.name}
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">User not found</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}