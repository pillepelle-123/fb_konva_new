import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navigation() {
  const { user, logout } = useAuth();

  return (
    <nav className="nav">
      <div className="nav-container">
        <h1 className="nav-title">FB Konva App</h1>
        <div className="nav-links">
          {user ? (
            <>
              <Link to="/dashboard" className="nav-link">Dashboard</Link>
              <Link to="/books" className="nav-link">My Books</Link>
              <Link to="/books/archive" className="nav-link">Archive</Link>
              <span className="nav-link">Hello, {user.name}</span>
              <button onClick={logout} className="nav-link" style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/register" className="nav-link">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}