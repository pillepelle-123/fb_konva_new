import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { EditorProvider } from './context/EditorContext'
import Navigation from './components/Navigation'
import EditorBar from './components/Editor/EditorBar'
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
  const { user } = useAuth()
  const [serverMessage, setServerMessage] = useState('')
  const location = useLocation()
  const isEditorRoute = location.pathname.startsWith('/editor/')

  useEffect(() => {
    fetch('http://localhost:5000')
      .then(res => res.json())
      .then(data => setServerMessage(data.message))
      .catch(err => console.error('Error connecting to server:', err))
  }, [])

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Navigation />
      <main style={{ flex: 1, overflow: isEditorRoute ? 'hidden' : 'auto' }} className={isEditorRoute ? '' : 'main'}>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Home serverMessage={serverMessage} />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/books" element={<ProtectedRoute><BooksList /></ProtectedRoute>} />
          <Route path="/books/archive" element={<ProtectedRoute><BookArchive /></ProtectedRoute>} />
          <Route path="/editor/:bookId" element={<ProtectedRoute><EditorWithBar /></ProtectedRoute>} />
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

function EditorWithBar() {
  return (
    <EditorProvider>
      <EditorBar />
      <Editor />
    </EditorProvider>
  );
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