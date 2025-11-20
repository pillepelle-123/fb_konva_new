import { useState } from 'react';
import { Pen } from 'lucide-react';
import { useEditor } from '../../../../context/editor-context';
import { useAuth } from '../../../../context/auth-context';

interface BookTitleProps {
  title: string;
  readOnly?: boolean;
}

export function BookTitle({ title, readOnly = false }: BookTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(title);
  const [isHovered, setIsHovered] = useState(false);
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
          className="text-sm md:text-lg text-foreground bg-transparent outline-none text-center md:text-center"
          autoFocus
        />
      ) : (
        <div 
          className="inline-flex items-center gap-2"
          onMouseEnter={() => !readOnly && setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          <h1 
            className={`text-sm md:text-lg text-foreground whitespace-nowrap ${readOnly ? '' : 'cursor-pointer hover:text-primary'}`}
            onClick={readOnly ? undefined : () => { setEditName(title); setIsEditing(true); }}
          >
            {title}
            
          </h1>
          {!readOnly && (
            <Pen 
              className={`h-3 w-3 text-muted-foreground transition-opacity ${isHovered ? 'opacity-100' : 'opacity-0'}`}
            />
          )}
        </div>
      )}
    </div>
  );
}