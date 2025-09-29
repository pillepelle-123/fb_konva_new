import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface ArchivedBook {
  id: number;
  name: string;
  pageSize: string;
  orientation: string;
  isOwner: boolean;
  createdAt: string;
}

export default function BookArchive() {
  const { token } = useAuth();
  const [books, setBooks] = useState<ArchivedBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArchivedBooks();
  }, []);

  const fetchArchivedBooks = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/books/archived', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setBooks(data);
      }
    } catch (error) {
      console.error('Error fetching archived books:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRestore = async (bookId: number) => {
    try {
      const response = await fetch(`http://localhost:5000/api/books/${bookId}/archive`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        fetchArchivedBooks();
      }
    } catch (error) {
      console.error('Error restoring book:', error);
    }
  };

  const handleDelete = async (bookId: number) => {
    if (!confirm('Are you sure you want to permanently delete this book? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await fetch(`http://localhost:5000/api/books/${bookId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        fetchArchivedBooks();
      }
    } catch (error) {
      console.error('Error deleting book:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) return <div className="home"><p>Loading archived books...</p></div>;

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 className="title">Book Archive</h1>

      {books.length === 0 ? (
        <div className="card">
          <p className="card-text">No archived books.</p>
        </div>
      ) : (
        <div className="card">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Name</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Size/Orientation</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Created</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Role</th>
                <th style={{ padding: '1rem', textAlign: 'left' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {books.map(book => (
                <tr key={book.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '1rem' }}>{book.name}</td>
                  <td style={{ padding: '1rem' }}>{book.pageSize} / {book.orientation}</td>
                  <td style={{ padding: '1rem' }}>{formatDate(book.createdAt)}</td>
                  <td style={{ padding: '1rem' }}>{book.isOwner ? 'Owner' : 'Collaborator'}</td>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                      <button 
                        onClick={() => handleRestore(book.id)}
                        style={{ padding: '0.25rem 0.5rem', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8rem' }}
                      >
                        Restore
                      </button>
                      {book.isOwner && (
                        <button 
                          onClick={() => handleDelete(book.id)}
                          style={{ padding: '0.25rem 0.5rem', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '0.8rem' }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}