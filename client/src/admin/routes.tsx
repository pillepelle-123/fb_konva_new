import { lazy, Suspense } from 'react'
import { AdminGuard } from './guards'

const AdminApp = lazy(() => import('./AdminApp'))

export function AdminRoute() {
  return (
    <AdminGuard>
      <div className="h-full min-h-0 flex flex-col">
        <Suspense fallback={<div className="flex min-h-[50vh] items-center justify-center">Loading admin…</div>}>
          <AdminApp />
        </Suspense>
      </div>
    </AdminGuard>
  )
}

export default AdminRoute

