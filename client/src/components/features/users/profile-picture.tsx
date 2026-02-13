import { useState, useEffect, useCallback } from 'react';
import { Edit2 } from 'lucide-react';
import { useAuth } from '../../../context/auth-context';
import ProfilePictureEditor from './profile-picture-editor';
import { getConsistentColor } from '../../../utils/consistent-color';

interface ProfilePictureProps {
  name: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
  userId?: number;
  editable?: boolean;
  variant?: 'default' | 'withColoredBorder';
}

const sizeMap: Record<'xs' | 'sm' | 'md' | 'lg', { class: string; pixels: number }> = {
  xs: { class: 'w-5 h-5', pixels: 24 },
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

  const fetchProfilePicture = useCallback(async () => {
    if (!userId || !token) {
      setProfileImageUrl(null);
      return;
    }
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
        credentials: 'include'
      });
      if (response.ok) {
        const userData = await response.json();
        const pictureField = size === 'lg' || size === 'md' ? 'profile_picture_192' : 'profile_picture_32';
        if (userData[pictureField]) {
          const sizeParam = size === 'lg' || size === 'md' ? '192' : '32';
          setProfileImageUrl(`${apiUrl}/users/${userId}/profile-picture/${sizeParam}`);
        } else {
          setProfileImageUrl(null);
        }
      } else {
        setProfileImageUrl(null);
      }
    } catch (error) {
      console.error('Error fetching profile picture:', error);
      setProfileImageUrl(null);
    }
  }, [token, userId, size]);

  useEffect(() => {
    fetchProfilePicture();
  }, [fetchProfilePicture]);

  // Reset profile image URL when userId or name changes
  useEffect(() => {
    if (!userId) {
      setProfileImageUrl(null);
    }
  }, [userId, name]);

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
        const newUrl = `${apiUrl}/users/${userId}/profile-picture/192?t=${Date.now()}`;
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
            className={`w-full h-full rounded-full object-cover ${className}`}
            src={imageUrl}
            alt={displayName}
            crossOrigin={profileImageUrl ? 'use-credentials' : undefined}
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
        className={`${sizeClass} rounded-full object-cover ${className}`}
        src={imageUrl}
        alt={displayName}
        crossOrigin={profileImageUrl ? 'use-credentials' : undefined}
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