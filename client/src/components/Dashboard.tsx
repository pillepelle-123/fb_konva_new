import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface DashboardData {
  stats: {
    myBooks: number;
    contributedBooks: number;
    totalCollaborators: number;
  };
  recentBooks: {
    id: number;
    name: string;
    lastModified: string;
    collaboratorCount: number;
    isOwner: boolean;
  }[];
}

export default function Dashboard() {
  const { user, token } = useAuth();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/books/dashboard', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setDashboardData(data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return <div className="home"><p>Loading dashboard...</p></div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      <h1 className="title">Welcome back, {user?.name}!</h1>
      
      {/* Statistics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <div className="card">
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#2563eb' }}>{dashboardData?.stats.myBooks || 0}</h3>
          <p className="card-text">My Books</p>
        </div>
        <div className="card">
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#059669' }}>{dashboardData?.stats.contributedBooks || 0}</h3>
          <p className="card-text">Books I Contribute To</p>
        </div>
        <div className="card">
          <h3 style={{ margin: '0 0 0.5rem 0', color: '#dc2626' }}>{dashboardData?.stats.totalCollaborators || 0}</h3>
          <p className="card-text">Total Collaborators</p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <h2 className="card-title">Quick Actions</h2>
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '1rem' }}>
          <Link to="/books" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#2563eb', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              📚 Create New Book
            </button>
          </Link>
          <Link to="/books" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#059669', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              📖 View All Books
            </button>
          </Link>
          <button style={{ padding: '0.75rem 1.5rem', backgroundColor: '#dc2626', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            ❓ Manage Questions
          </button>
        </div>
      </div>

      {/* Recent Books */}
      <div className="card">
        <h2 className="card-title">Recent Books</h2>
        {dashboardData?.recentBooks.length === 0 ? (
          <p className="card-text">No books yet. Create your first book to get started!</p>
        ) : (
          <div style={{ marginTop: '1rem' }}>
            {dashboardData?.recentBooks.map(book => (
              <div key={book.id} style={{ 
                padding: '1rem', 
                border: '1px solid #e5e7eb', 
                borderRadius: '4px', 
                marginBottom: '0.5rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem 0', fontSize: '1.1rem' }}>{book.name}</h3>
                  <p style={{ margin: '0', color: '#6b7280', fontSize: '0.9rem' }}>
                    Last modified: {formatDate(book.lastModified)} • 
                    {book.collaboratorCount} collaborator{book.collaboratorCount !== 1 ? 's' : ''} • 
                    {book.isOwner ? 'Owner' : 'Collaborator'}
                  </p>
                </div>
                <button style={{ 
                  padding: '0.5rem 1rem', 
                  backgroundColor: '#f3f4f6', 
                  border: '1px solid #d1d5db', 
                  borderRadius: '4px', 
                  cursor: 'pointer' 
                }}>
                  Open
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}