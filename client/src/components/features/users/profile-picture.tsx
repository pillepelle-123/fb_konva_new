import { useState, useEffect } from 'react';
import { Edit2 } from 'lucide-react';
import { useAuth } from '../../../context/auth-context';
import ProfilePictureEditor from './profile-picture-editor';

interface ProfilePictureProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  userId?: number;
  editable?: boolean;
  variant?: 'default' | 'withColoredBorder';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map(part => part.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function getConsistentColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    '3b82f6', '8b5cf6', 'ef4444', '10b981', 'f59e0b', 'ec4899', '06b6d4', 'f97316',
    'f87171', 'fb7185', 'f472b6', 'e879f9', 'c084fc', 'a78bfa', '8b5cf6', '7c3aed',
    '6366f1', '4f46e5', '3b82f6', '2563eb', '0ea5e9', '0891b2', '0e7490', '0f766e',
    '059669', '047857', '065f46', '166534', '15803d', '16a34a', '22c55e', '4ade80',
    '65a30d', '84cc16', 'a3e635', 'bef264', 'eab308', 'f59e0b', 'f97316', 'ea580c',
    'dc2626', 'b91c1c', '991b1b', '7f1d1d', '78716c', '57534e', '44403c', '292524'
  ];
  return colors[Math.abs(hash) % colors.length];
}

const sizeMap: Record<'xs' | 'sm' | 'md' | 'lg', { class: string; pixels: number }> = {
  xs: { class: 'w-6 h-6', pixels: 32 },
  sm: { class: 'w-10 h-10', pixels: 32 },
  md: { class: 'w-24 h-24', pixels: 96 },
  lg: { class: 'w-48 h-48', pixels: 192 },
};

export default function ProfilePicture({ name, size = 'md', className = '', userId, editable = false, variant = 'default' }: ProfilePictureProps) {
  const displayName = name?.trim() || 'User';
  const { class: sizeClass, pixels } = sizeMap[size];
  const { user, token } = useAuth();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null);

  const canEdit = editable && user && userId === user.id;

  useEffect(() => {
    if (userId && token) {
      fetchProfilePicture();
    }
  }, [userId, token]);

  const fetchProfilePicture = async () => {
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const userData = await response.json();
        const pictureField = size === 'lg' || size === 'md' ? 'profile_picture_192' : 'profile_picture_32';
        if (userData[pictureField]) {
          const baseUrl = apiUrl.replace('/api', '');
          setProfileImageUrl(`${baseUrl}/uploads/profile_pictures/${userId}/${userData[pictureField]}`);
        }
      }
    } catch (error) {
      console.error('Error fetching profile picture:', error);
    }
  };

  const handleSaveProfilePicture = async (file192: File, file32: File) => {
    if (!token || !userId) return;

    const formData = new FormData();
    formData.append('profile192', file192);
    formData.append('profile32', file32);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/users/profile-picture`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        // console.log('Profile picture response:', data);
        const baseUrl = apiUrl.replace('/api', '');
        const newUrl = `${baseUrl}${data.profilePicture192}?t=${Date.now()}`;
        // console.log('Setting profile image URL to:', newUrl);
        setProfileImageUrl(newUrl);
        
        // Notify other components that profile picture was updated
        window.dispatchEvent(new CustomEvent('profilePictureUpdated'));
      }
    } catch (error) {
      console.error('Error uploading profile picture:', error);
    }
  };

  const imageUrl = profileImageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=${getConsistentColor(displayName)}&color=fff&size=${pixels}`;
  
  if (variant === 'withColoredBorder') {
    return (
      <div className="relative inline-block">
        <div 
          className={`${sizeClass} rounded-full ${size === "lg" || size === "md" ? (size === "lg" ? "p-3" : "p-2") : "p-0.5"} flex items-center justify-center`}
          style={{ backgroundColor: `#${getConsistentColor(displayName)}` }}
        >
          <img
            className={`w-full h-full rounded-full ${className}`}
            src={imageUrl}
            alt={displayName}
          />
        </div>
        {canEdit && (
          <button
            onClick={() => setIsEditorOpen(true)}
            className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 hover:bg-primary/90 transition-colors"
          >
            <Edit2 className="h-3 w-3" />
          </button>
        )}
        <ProfilePictureEditor
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSave={handleSaveProfilePicture}
        />
      </div>
    );
  }
  
  return (
    <div className="relative inline-block">
      <img
        className={`${sizeClass} rounded-full ${className}`}
        src={imageUrl}
        alt={displayName}
      />
      {canEdit && (
        <button
          onClick={() => setIsEditorOpen(true)}
          className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1.5 hover:bg-primary/90 transition-colors"
        >
          <Edit2 className="h-3 w-3" />
        </button>
      )}
      <ProfilePictureEditor
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        onSave={handleSaveProfilePicture}
      />
    </div>
  );
}