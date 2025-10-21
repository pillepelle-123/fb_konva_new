import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/auth-context'
import { EditorProvider } from './context/editor-context'
import { SocketProvider } from './context/socket-context'
import PageContainer from './components/layouts/page-container'
import Navigation from './components/layouts/navigation'

import Login from './pages/auth/login'
import Register from './pages/auth/register'
import Dashboard from './pages/dashboard/index'
import BooksList from './pages/books/index'
import BookArchive from './pages/books/archive'
import AnswerForm from './pages/books/answer_form'
import ImagesList from './pages/images/index'
import QuestionsList from './pages/questions/index'
import BookFriendsList from './pages/books/friends'
import PageUserPage from './pages/books/page-user'
import FriendsList from './pages/friends/index'
import Profile from './pages/profile/index'
import Settings from './pages/profile/settings'
import Editor from './pages/editor'
import MessengerPage from './pages/messenger'
import NotFound from './pages/404'
import ProtectedRoute from './components/layouts/protected-route'
import BookAccessGuard from './components/layouts/book-access-guard'


function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <AppContent />
        </Router>
      </SocketProvider>
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
          <Route path="/images" element={<ProtectedRoute><ImagesList /></ProtectedRoute>} />
          <Route path="/questions/:bookId" element={<ProtectedRoute><BookAccessGuard><QuestionsList /></BookAccessGuard></ProtectedRoute>} />
          <Route path="/books/:bookId/friends" element={<ProtectedRoute><BookAccessGuard><BookFriendsList /></BookAccessGuard></ProtectedRoute>} />
          <Route path="/books/:bookId/page-users" element={<ProtectedRoute><BookAccessGuard><PageUserPage /></BookAccessGuard></ProtectedRoute>} />
          <Route path="/friends" element={<ProtectedRoute><FriendsList /></ProtectedRoute>} />
          <Route path="/messenger" element={<ProtectedRoute><MessengerPage /></ProtectedRoute>} />
          <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/my-profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/books/:bookId/answers" element={<ProtectedRoute><BookAccessGuard><AnswerForm /></BookAccessGuard></ProtectedRoute>} />
          <Route path="/editor/:bookId" element={<ProtectedRoute><BookAccessGuard><EditorWithBar /></BookAccessGuard></ProtectedRoute>} />
          <Route path="/404" element={<NotFound />} />
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