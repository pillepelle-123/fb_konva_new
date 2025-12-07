import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './layouts'
import { AdminBackgroundImagesPage, AdminBooksPage, AdminPageRecordsPage, AdminStickersPage, AdminUsersPage } from './pages'
import { AdminQueryClientProvider } from './providers'

export default function AdminApp() {
  return (
    <AdminQueryClientProvider>
      <AdminLayout>
        <Routes>
          <Route index element={<Navigate to="users" replace />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="books" element={<AdminBooksPage />} />
          <Route path="pages" element={<AdminPageRecordsPage />} />
          <Route path="background-images" element={<AdminBackgroundImagesPage />} />
          <Route path="stickers" element={<AdminStickersPage />} />
          <Route path="*" element={<Navigate to="users" replace />} />
        </Routes>
      </AdminLayout>
    </AdminQueryClientProvider>
  )
}

