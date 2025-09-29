import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Login from './components/Login'
import Register from './components/Register'
import Dashboard from './components/Dashboard'
import BooksList from './components/BooksList'
import BookArchive from './components/BookArchive'
import Editor from './components/Editor/Editor'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppContent />
      </Router>
    </AuthProvider>
  )
}

function AppContent() {
  const { user, logout } = useAuth()
  const [serverMessage, setServerMessage] = useState('')

  useEffect(() => {
    fetch('http://localhost:5000')
      .then(res => res.json())
      .then(data => setServerMessage(data.message))
      .catch(err => console.error('Error connecting to server:', err))
  }, [])

  return (
    <div>
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

      <main className="main">
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Home serverMessage={serverMessage} />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/books" element={<ProtectedRoute><BooksList /></ProtectedRoute>} />
          <Route path="/books/archive" element={<ProtectedRoute><BookArchive /></ProtectedRoute>} />
          <Route path="/editor/:bookId" element={<ProtectedRoute><Editor /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPanel /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  )
}

function Home({ serverMessage }: { serverMessage: string }) {
  return (
    <div className="home">
      <h1 className="title">Welcome to FB Konva App</h1>
      <div className="card">
        <h2 className="card-title">Server Status:</h2>
        <p className="card-text">{serverMessage || 'Connecting to server...'}</p>
        <p style={{ marginTop: '1rem' }}>Please login or register to continue.</p>
      </div>
    </div>
  )
}

function AdminPanel() {
  return (
    <div className="home">
      <h1 className="title">Admin Panel</h1>
      <div className="card">
        <h2 className="card-title">Admin Features</h2>
        <p className="card-text">Manage books, questions, and invite editors.</p>
      </div>
    </div>
  )
}

export default App