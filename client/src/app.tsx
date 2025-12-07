import { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/auth-context'
import { EditorProvider } from './context/editor-context'
import { SocketProvider } from './context/socket-context'
import PageContainer from './components/layouts/page-container'
import Navigation from './components/layouts/navigation'
import { AdminRoute } from './admin'
import { Toaster } from './components/ui/sonner'

import Login from './pages/auth/login'
import Register from './pages/auth/register'
import Dashboard from './pages/dashboard/index'
import BooksList from './pages/books/index'
import BookArchive from './pages/books/archive'
import AnswerForm from './pages/books/answer_form'
import BookCreatePage from './pages/books/create'
import ImagesList from './pages/images/index'
import QuestionsList from './pages/questions/index'
import BookManagerPage from './pages/books/manager'
import BookExportPage from './pages/books/[bookId]/export'
import FriendsList from './pages/friends/index'
import Profile from './pages/profile/index'
import Settings from './pages/profile/settings'
import Editor from './pages/editor'
import MessengerPage from './pages/messenger'
import NotFound from './pages/404'
import InvitationResponse from './pages/invitations/respond'
import ProtectedRoute from './components/layouts/protected-route'
import BookAccessGuard from './components/layouts/book-access-guard'
import QuestionDialogHandler from './components/features/editor/question-dialog-handler'


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
  const isBookCreateRoute = location.pathname === '/books/create'
  // Routes that manage their own scrolling should use overflow-hidden
  const shouldHideOverflow = isEditorRoute || isBookCreateRoute

  useEffect(() => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api'
    const baseUrl = apiUrl.replace('/api', '')
    fetch(baseUrl)
      .then(res => {
        // Check if response is JSON before parsing
        const contentType = res.headers.get('content-type')
        if (contentType && contentType.includes('application/json')) {
          return res.json()
        } else {
          // If not JSON, return a default message
          return { message: 'Server is running' }
        }
      })
      .then(data => setServerMessage(data.message || 'Server is running'))
      .catch(err => {
        console.error('Error connecting to server:', err)
        setServerMessage('Unable to connect to server')
      })
  }, [])

  return (
    <PageContainer>
      <Navigation />
      <main className={`flex-1 min-h-0 ${shouldHideOverflow ? 'overflow-hidden' : 'overflow-auto'} w-full`}>
        <Routes>
          <Route path="/" element={user ? <Navigate to="/dashboard" /> : <Home serverMessage={serverMessage} />} />
          <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
          <Route path="/register" element={user ? <Navigate to="/dashboard" /> : <Register />} />
          <Route path="/invitations/respond" element={<InvitationResponse />} />
          <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/books" element={<ProtectedRoute><BooksList /></ProtectedRoute>} />
          <Route path="/books/create" element={<ProtectedRoute><BookCreatePage /></ProtectedRoute>} />
          <Route path="/books/archive" element={<ProtectedRoute><BookArchive /></ProtectedRoute>} />
          <Route path="/images" element={<ProtectedRoute><ImagesList /></ProtectedRoute>} />
          <Route path="/questions/:bookId" element={<ProtectedRoute><BookAccessGuard><QuestionsList /></BookAccessGuard></ProtectedRoute>} />
          <Route path="/books/:bookId/manager" element={<ProtectedRoute><BookAccessGuard><BookManagerPage /></BookAccessGuard></ProtectedRoute>} />
          <Route path="/books/:bookId/export" element={<ProtectedRoute><BookAccessGuard><BookExportPage /></BookAccessGuard></ProtectedRoute>} />
          <Route path="/friends" element={<ProtectedRoute><FriendsList /></ProtectedRoute>} />
          <Route path="/messenger" element={<ProtectedRoute><MessengerPage /></ProtectedRoute>} />
          <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/my-profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/books/:bookId/answers" element={<ProtectedRoute><BookAccessGuard><AnswerForm /></BookAccessGuard></ProtectedRoute>} />
          <Route path="/editor/:bookId" element={<ProtectedRoute><BookAccessGuard><EditorWithBar /></BookAccessGuard></ProtectedRoute>} />
          <Route path="/404" element={<NotFound />} />
          <Route path="/admin/*" element={<AdminRoute />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <Toaster />
    </PageContainer>
  )
}

function Home({ serverMessage }: { serverMessage: string }) {
  return (
    <div className="container mx-auto px-4 py-4">
      <div className="max-w-2xl mx-auto text-center space-y-6">
        <h1 className="text-4xl tracking-tight text-foreground">
          Welcome to dein-freundebuch.de
        </h1>
        <p className="text-xl text-muted-foreground">
          Create and collaborate on beautiful books and documents
        </p>
        <div className="bg-card border rounded-lg p-6 shadow-sm">
          <h2 className="mb-2">Server Status</h2>
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
      <QuestionDialogHandler />
    </EditorProvider>
  );
}

export default App