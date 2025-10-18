import { useState } from 'react';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';

interface BookTitleProps {
  title: string;
}

export function BookTitle({ title }: BookTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(title);
  const { state, dispatch } = useEditor();
  const { token } = useAuth();

  const handleSave = async () => {
    if (editName.trim() && editName !== title && state.currentBook) {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
        const response = await fetch(`${apiUrl}/books/${state.currentBook.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({ name: editName.trim() })
        });
        if (response.ok) {
          dispatch({ type: 'UPDATE_BOOK_NAME', payload: editName.trim() });
        }
      } catch (error) {
        console.error('Error renaming book:', error);
      }
    }
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditName(title);
    setIsEditing(false);
  };

  return (
    <div className="text-center md:text-right">
      {isEditing ? (
        <input
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          onBlur={handleCancel}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSave();
            if (e.key === 'Escape') handleCancel();
          }}
          className="text-sm md:text-lg font-semibold text-foreground bg-transparent border-b border-border outline-none text-center md:text-center"
          autoFocus
        />
      ) : (
        <h1 
          className="text-sm md:text-lg font-semibold text-foreground whitespace-nowrap cursor-pointer hover:text-primary"
          onClick={() => { setEditName(title); setIsEditing(true); }}
        >
          {title}
        </h1>
      )}
    </div>
  );
}