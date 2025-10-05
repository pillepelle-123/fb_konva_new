import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/auth-context'
import { EditorProvider } from './context/editor-context'
import PageContainer from './components/layout/page-container'
import Navigation from './components/layout/navigation'

import Login from './pages/auth/login'
import Register from './pages/auth/register'
import Dashboard from './pages/dashboard/index'
import BooksList from './pages/books/index'
import BookArchive from './pages/books/archive'
import PhotosList from './pages/photos/index'
import QuestionsList from './pages/questions/index'
import FriendsList from './pages/friends/index'
import Editor from './pages/editor'
import ProtectedRoute from './components/layout/protected-route'


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
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    const baseUrl = apiUrl.replace('/api', '')
    fetch(baseUrl)
      .then(res => res.json())
      .then(data => setServerMessage(data.message))
      .catch(err => console.error('Error connecting to server:', err))
  }, [])

  return (
    <PageContainer>
      <Navigation />
      <main className={`flex-1 min-h-0 ${isEditorRoute ? 'overflow-hidden' : 'overflow-auto'} w-full`}>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Home serverMessage={serverMessage} />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/books" element={<ProtectedRoute><BooksList /></ProtectedRoute>} />
          <Route path="/books/archive" element={<ProtectedRoute><BookArchive /></ProtectedRoute>} />
          <Route path="/photos" element={<ProtectedRoute><PhotosList /></ProtectedRoute>} />
          <Route path="/questions/:bookId" element={<ProtectedRoute><QuestionsList /></ProtectedRoute>} />
          <Route path="/friends/:bookId" element={<ProtectedRoute><FriendsList /></ProtectedRoute>} />
          <Route path="/editor/:bookId" element={<ProtectedRoute><EditorWithBar /></ProtectedRoute>} />
          <Route path="/admin" element={<ProtectedRoute requiredRole="admin"><AdminPanel /></ProtectedRoute>} />
        </Routes>
      </main>
    </PageContainer>
  )
}

function Home({ serverMessage }: { serverMessage: string }) {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <h1 className="text-4xl font-bold tracking-tight text-foreground">
          Welcome to freundebuch.io
        </h1>
        <p className="text-xl text-muted-foreground">
          Create and collaborate on beautiful books and documents
        </p>
        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Server Status</h2>
          <p className="text-muted-foreground">{serverMessage || 'Connecting to server...'}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Please login or register to continue.
          </p>
        </div>
      </div>
    </div>
  )
}

function EditorWithBar() {
  return (
    <EditorProvider>
      <Editor />
    </EditorProvider>
  );
}

function AdminPanel() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">
          Admin Panel
        </h1>
        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-2">Admin Features</h2>
          <p className="text-muted-foreground">
            Manage books, questions, and invite authors.
          </p>
        </div>
      </div>
    </div>
  )
}

export default App