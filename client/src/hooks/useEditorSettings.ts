import { useState, useEffect } from 'react';
import { useAuth } from '../context/auth-context';
import { useEditor } from '../context/editor-context';

interface EditorSettings {
  favoriteColors?: {
    strokeColors?: string[];
  };
}

export function useEditorSettings(bookId: number | string | undefined) {
  const { token } = useAuth();
  const { state, dispatch } = useEditor();
  const [settings, setSettings] = useState<EditorSettings>(state.editorSettings || {});
  const [loading, setLoading] = useState(false);

  // Keep local hook state aligned with global editor settings
  useEffect(() => {
    setSettings(state.editorSettings || {});
  }, [state.editorSettings]);

  // Load settings
  useEffect(() => {
    if (!bookId || !token) return;
    
    // Skip loading for temporary books
    if (typeof bookId === 'string' && bookId.startsWith('temp_')) {
      setSettings({});
      return;
    }

    const loadSettings = async () => {
      setLoading(true);
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/editor-settings/${bookId}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          setSettings(data);
          dispatch({ type: 'SET_EDITOR_SETTINGS', payload: data });
        } else {
          console.error('Failed to load settings:', response.status, response.statusText);
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
    
    // Skip saving for temporary books
    if (typeof bookId === 'string' && bookId.startsWith('temp_')) {
      // Update local state only for temporary books
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
      dispatch({
        type: 'SET_EDITOR_SETTINGS',
        payload: {
          ...state.editorSettings,
          favoriteColors: {
            ...(state.editorSettings?.favoriteColors || {}),
            [settingKey]: settingValue
          }
        }
      });
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/editor-settings/${bookId}`, {
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
        dispatch({
          type: 'SET_EDITOR_SETTINGS',
          payload: {
            ...state.editorSettings,
            favoriteColors: {
              ...(state.editorSettings?.favoriteColors || {}),
              [settingKey]: settingValue
            }
          }
        });
      } else {
        console.error('Failed to save setting:', response.status, response.statusText);
        const errorText = await response.text();
        console.error('Error details:', errorText);
      }
    } catch (error) {
      console.error('Failed to save editor setting:', error);
    }
  };

  // Delete setting
  const deleteSetting = async (settingType: string, settingKey: string) => {
    if (!bookId || !token) return;
    
    // Skip deleting for temporary books
    if (typeof bookId === 'string' && bookId.startsWith('temp_')) {
      // Update local state only for temporary books
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
      if (settingType === 'favoriteColors' && settingKey === 'strokeColors') {
        const favoriteColors = { ...(state.editorSettings?.favoriteColors || {}) };
        delete favoriteColors.strokeColors;
        dispatch({
          type: 'SET_EDITOR_SETTINGS',
          payload: {
            ...state.editorSettings,
            favoriteColors
          }
        });
      }
      return;
    }

    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
      const response = await fetch(`${apiUrl}/editor-settings/${bookId}/${settingType}/${settingKey}`, {
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
        if (settingType === 'favoriteColors' && settingKey === 'strokeColors') {
          const favoriteColors = { ...(state.editorSettings?.favoriteColors || {}) };
          delete favoriteColors.strokeColors;
          dispatch({
            type: 'SET_EDITOR_SETTINGS',
            payload: {
              ...state.editorSettings,
              favoriteColors
            }
          });
        }
      } else {
        console.error('Failed to delete setting:', response.status, response.statusText);
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