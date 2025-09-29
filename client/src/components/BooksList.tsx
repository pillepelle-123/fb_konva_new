import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import QuestionsManager from './QuestionsManager';

interface Book {
  id: number;
  name: string;
  pageSize: string;
  orientation: string;
  pageCount: number;
  collaboratorCount: number;
  isOwner: boolean;
}

export default function BooksList() {
  const { token } = useAuth();
  const [books, setBooks] = useState<Book[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showCollaboratorModal, setShowCollaboratorModal] = useState<number | null>(null);
  const [showQuestionsModal, setShowQuestionsModal] = useState<{ bookId: number; bookName: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBooks();
  }, []);

  const fetchBooks = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/books', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBooks(data);
      }
    } catch (error) {
      console.error('Error fetching books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async (bookId: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/books/${bookId}/archive`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        fetchBooks();
      }
    } catch (error) {
      console.error('Error archiving book:', error);
    }
  };

  if (loading) return <div className="home"><p>Loading books...</p></div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <h1 className="title">My Books</h1>
        <button 
          onClick={() => setShowAddForm(true)}
          style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
        >
          📚 Add Book
        </button>
      </div>

      {books.length === 0 ? (
        <div className="card">
          <p className="card-text">No books yet. Create your first book to get started!</p>
        </div>
      ) : (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Size/Orientation</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Pages</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Collaborators</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map(book => (
                <tr key={book.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem' }}>{book.name}</td>
                  <td style={{ padding: '1rem' }}>{book.pageSize} / {book.orientation}</td>
                  <td style={{ padding: '1rem' }}>{book.pageCount}</td>
                  <td style={{ padding: '1rem' }}>{book.collaboratorCount}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <Link to={`/editor/${book.id}`} style={{ textDecoration: 'none' }}>
                        <button style={{ padding: '0.25rem 0.5rem', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8rem' }}>
                          Edit
                        </button>
                      </Link>
                      <button 
                        onClick={() => handleArchive(book.id)}
                        style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Archive
                      </button>
                      {book.isOwner && (
                        <>
                          <button 
                            onClick={() => setShowCollaboratorModal(book.id)}
                            style={{ padding: '0.25rem 0.5rem', backgroundColor: '#7c3aed', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            Collaborators
                          </button>
                          <button 
                            onClick={() => setShowQuestionsModal({ bookId: book.id, bookName: book.name })}
                            style={{ padding: '0.25rem 0.5rem', backgroundColor: '#ea580c', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8rem' }}
                          >
                            Questions
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showAddForm && <AddBookForm onClose={() => setShowAddForm(false)} onSuccess={fetchBooks} />}
      {showCollaboratorModal && <CollaboratorModal bookId={showCollaboratorModal} onClose={() => setShowCollaboratorModal(null)} />}
      {showQuestionsModal && (
        <QuestionsManager 
          bookId={showQuestionsModal.bookId} 
          bookName={showQuestionsModal.bookName}
          onClose={() => setShowQuestionsModal(null)} 
        />
      )}
    </div>
  );
}

function AddBookForm({ onClose, onSuccess }: { onClose: () => void; onSuccess: () => void }) {
  const { token } = useAuth();
  const [name, setName] = useState('');
  const [pageSize, setPageSize] = useState('A4');
  const [orientation, setOrientation] = useState('portrait');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('http://localhost:5000/api/books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ name, pageSize, orientation })
      });
      if (response.ok) {
        onSuccess();
        onClose();
      }
    } catch (error) {
      console.error('Error creating book:', error);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ maxWidth: '400px', width: '90%' }}>
        <h2 className="card-title">Add New Book</h2>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Book Name:</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Page Size:</label>
            <select
              value={pageSize}
              onChange={(e) => setPageSize(e.target.value)}
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
            >
              <option value="A4">A4</option>
              <option value="A5">A5</option>
              <option value="A3">A3</option>
              <option value="Letter">Letter</option>
              <option value="Square">Square</option>
            </select>
          </div>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Orientation:</label>
            <div>
              <label style={{ marginRight: '1rem' }}>
                <input
                  type="radio"
                  value="portrait"
                  checked={orientation === 'portrait'}
                  onChange={(e) => setOrientation(e.target.value)}
                  style={{ marginRight: '0.25rem' }}
                />
                Portrait
              </label>
              <label>
                <input
                  type="radio"
                  value="landscape"
                  checked={orientation === 'landscape'}
                  onChange={(e) => setOrientation(e.target.value)}
                  style={{ marginRight: '0.25rem' }}
                />
                Landscape
              </label>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.5rem 1rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Create Book
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CollaboratorModal({ bookId, onClose }: { bookId: number; onClose: () => void }) {
  const { token } = useAuth();
  const [email, setEmail] = useState('');

  const handleAddCollaborator = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`http://localhost:5000/api/books/${bookId}/collaborators`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ email })
      });
      if (response.ok) {
        setEmail('');
        alert('Collaborator added successfully!');
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add collaborator');
      }
    } catch (error) {
      console.error('Error adding collaborator:', error);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div className="card" style={{ maxWidth: '400px', width: '90%' }}>
        <h2 className="card-title">Manage Collaborators</h2>
        <form onSubmit={handleAddCollaborator}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Add Collaborator by Email:</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              required
              style={{ width: '100%', padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
            />
          </div>
          <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.5rem 1rem', backgroundColor: '#6b7280', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Close
            </button>
            <button type="submit" style={{ padding: '0.5rem 1rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Add Collaborator
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}