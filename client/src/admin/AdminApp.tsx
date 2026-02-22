import { Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './layouts'
import { AdminBackgroundImagesPage, AdminBooksPage, AdminColorPalettesPage, AdminLayoutsPage, AdminPageRecordsPage, AdminStickersPage, AdminThemesPage, AdminUsersPage, SandboxEditorPage } from './pages'
import { AdminQueryClientProvider } from './providers'

export default function AdminApp() {
  return (
    <AdminQueryClientProvider>
      <div className="h-full min-h-0 flex flex-col">
        <AdminLayout>
          <Routes>
            <Route index element={<Navigate to="users" replace />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="books" element={<AdminBooksPage />} />
            <Route path="pages" element={<AdminPageRecordsPage />} />
            <Route path="background-images" element={<AdminBackgroundImagesPage />} />
            <Route path="stickers" element={<AdminStickersPage />} />
            <Route path="themes" element={<AdminThemesPage />} />
            <Route path="color-palettes" element={<AdminColorPalettesPage />} />
            <Route path="layouts" element={<AdminLayoutsPage />} />
            <Route path="sandbox" element={<SandboxEditorPage />} />
            <Route path="*" element={<Navigate to="users" replace />} />
          </Routes>
        </AdminLayout>
      </div>
    </AdminQueryClientProvider>
  )
}

