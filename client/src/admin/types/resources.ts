export type AdminRole = 'admin' | 'editor' | 'user'

export interface AdminUser {
  id: number
  name: string
  email: string
  role: AdminRole
  status: 'active' | 'invited' | 'suspended'
  createdAt: string
  lastLoginAt: string | null
}

export interface AdminBook {
  id: number
  name: string
  ownerName: string
  status: 'active' | 'archived' | 'draft'
  pageCount: number
  collaboratorCount: number
  updatedAt: string
}

export interface AdminPageRecord {
  id: number
  bookId: number
  bookName: string
  pageNumber: number
  assignedTo: string | null
  assigneeId: number | null
  status: 'draft' | 'in_review' | 'published'
  updatedAt: string
}

