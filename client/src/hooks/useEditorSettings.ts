import { useState, useEffect } from 'react';
import { useAuth } from '../context/auth-context';

interface EditorSettings {
  favoriteColors?: {
    strokeColors?: string[];
  };
}

interface FavoriteColors {
  strokeColors?: string[];
}

export function useEditorSettings(bookId: number | undefined) {
  const { token } = useAuth();
  const [settings, setSettings] = useState<EditorSettings>({});
  const [loading, setLoading] = useState(false);

  // Load settings
  useEffect(() => {
    if (!bookId || !token) return;

    const loadSettings = async () => {
      setLoading(true);
      try {
        const response = await fetch(`http://localhost:5000/api/editor-settings/${bookId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
        }
      } catch (error) {
        console.error('Failed to load editor settings:', error);
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [bookId, token]);

  // Save setting
  const saveSetting = async (settingType: string, settingKey: string, settingValue: any) => {
    if (!bookId || !token) return;

    try {
      const response = await fetch(`http://localhost:5000/api/editor-settings/${bookId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          settingType,
          settingKey,
          settingValue
        })
      });

      if (response.ok) {
        // Update local state
        setSettings(prev => {
          if (settingType === 'favoriteColors') {
            return {
              ...prev,
              favoriteColors: {
                ...prev.favoriteColors,
                [settingKey]: settingValue
              }
            };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Failed to save editor setting:', error);
    }
  };

  // Delete setting
  const deleteSetting = async (settingType: string, settingKey: string) => {
    if (!bookId || !token) return;

    try {
      const response = await fetch(`http://localhost:5000/api/editor-settings/${bookId}/${settingType}/${settingKey}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Update local state
        setSettings(prev => {
          const newSettings = { ...prev };
          if (settingType === 'favoriteColors' && newSettings.favoriteColors) {
            const favoriteColors = { ...newSettings.favoriteColors };
            if (settingKey === 'strokeColors') {
              delete favoriteColors.strokeColors;
            }
            newSettings.favoriteColors = favoriteColors;
          }
          return newSettings;
        });
      }
    } catch (error) {
      console.error('Failed to delete editor setting:', error);
    }
  };

  // Favorite colors helpers
  const favoriteStrokeColors = settings.favoriteColors?.strokeColors || [];

  const addFavoriteStrokeColor = (color: string) => {
    const newColors = [...favoriteStrokeColors, color];
    saveSetting('favoriteColors', 'strokeColors', newColors);
  };

  const removeFavoriteStrokeColor = (color: string) => {
    const newColors = favoriteStrokeColors.filter(c => c !== color);
    saveSetting('favoriteColors', 'strokeColors', newColors);
  };

  return {
    settings,
    loading,
    saveSetting,
    deleteSetting,
    favoriteStrokeColors,
    addFavoriteStrokeColor,
    removeFavoriteStrokeColor
  };
}