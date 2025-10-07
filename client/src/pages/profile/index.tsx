import { useState, useEffect } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/primitives/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/composites/card';
import BooksGrid from '../../components/features/books/book-grid';
import ProfilePicture from '../../components/features/users/profile-picture';
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
}



export default function Profile() {
  const { userId } = useParams<{ userId: string }>();
  const location = useLocation();
  const { token, user: currentUser } = useAuth();
  const [user, setUser] = useState<User | null>(null);
  const [sharedBooks, setSharedBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);

  const isMyProfile = location.pathname === '/my-profile';
  const targetUserId = isMyProfile ? currentUser?.id?.toString() : userId;

  useEffect(() => {
    if (targetUserId) {
      fetchUserProfile();
      fetchSharedBooks();
    } else if (isMyProfile && currentUser) {
      setUser(currentUser);
      fetchSharedBooks();
    }
  }, [targetUserId, isMyProfile, currentUser]);

  const fetchUserProfile = async () => {
    if (isMyProfile && currentUser) {
      setUser(currentUser);
      return;
    }
    
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/users/${targetUserId}`, {
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
      const response = await fetch(`${apiUrl}/users/${targetUserId}/shared-books`, {
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

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">User not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOwnProfile = currentUser?.id === user.id;
  const hasSharedBooks = sharedBooks.length > 0;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      {/* Profile Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start space-x-4 sm:space-x-6">
            <div className="hidden sm:block">
              <ProfilePicture name={user.name} size="lg" userId={user.id} editable={isOwnProfile} />
            </div>
            <div className="block sm:hidden">
              <ProfilePicture name={user.name} size="md" userId={user.id} editable={isOwnProfile} />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <CardTitle className="text-2xl">{user.name}</CardTitle>
                <p className="text-muted-foreground">{user.email}</p>
                <p className="text-sm text-muted-foreground capitalize">
                  {/* {user.role} •  */}
                  Member since {new Date(user.created_at).toLocaleDateString()}
                </p>
              </div>
              
              {!isOwnProfile && (
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
        </CardHeader>
      </Card>

      {/* Shared Books */}
      {hasSharedBooks && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            {isOwnProfile ? 'Your Books' : `Books shared with ${user.name}`}
          </h2>
          <BooksGrid books={sharedBooks} />
        </div>
      )}

      {!hasSharedBooks && !isOwnProfile && (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-muted-foreground">
              You don't have any shared books with {user.name}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}