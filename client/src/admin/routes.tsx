import { lazy, Suspense } from 'react'
import { AdminGuard } from './guards'

const AdminApp = lazy(() => import('./AdminApp'))

export function AdminRoute() {
  return (
    <AdminGuard>
      <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center">Lade Admin…</div>}>
        <AdminApp />
      </Suspense>
    </AdminGuard>
  )
}

export default AdminRoute

