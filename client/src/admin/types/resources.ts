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

export interface AdminBackgroundImageCategory {
  id: number
  name: string
  slug: string
  createdAt: string
  updatedAt: string
}

export interface AdminBackgroundImage {
  id: string
  slug: string
  name: string
  description: string | null
  category: AdminBackgroundImageCategory
  format: string
  storage: {
    type: 'local' | 's3'
    filePath: string | null
    thumbnailPath: string | null
    bucket: string | null
    objectKey: string | null
    publicUrl?: string | null
    thumbnailUrl?: string | null
  }
  defaults: {
    size: string | null
    position: string | null
    repeat: string | null
    width: number | null
    opacity: number
    backgroundColor: Record<string, unknown> | null
  }
  paletteSlots: string | null
  tags: string[]
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface AdminBackgroundImageInput {
  name: string
  slug?: string
  categoryId: number
  description?: string | null
  format?: string
  storageType?: 'local' | 's3'
  filePath?: string | null
  thumbnailPath?: string | null
  bucket?: string | null
  objectKey?: string | null
  defaults?: {
    size?: string | null
    position?: string | null
    repeat?: string | null
    width?: number | null
    opacity?: number | null
    backgroundColor?: Record<string, unknown> | null
  }
  paletteSlots?: string | null
  tags?: string[]
  metadata?: Record<string, unknown>
}

export interface AdminStickerCategory {
  id: number
  name: string
  slug: string
  createdAt: string
  updatedAt: string
}

export interface AdminSticker {
  id: string
  slug: string
  name: string
  description: string | null
  category: AdminStickerCategory
  format: string
  storage: {
    type: 'local' | 's3'
    filePath: string | null
    thumbnailPath: string | null
    bucket: string | null
    objectKey: string | null
    publicUrl?: string | null
    thumbnailUrl?: string | null
  }
  tags: string[]
  metadata: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface AdminStickerInput {
  name: string
  slug?: string
  categoryId: number
  description?: string | null
  format?: string
  storageType?: 'local' | 's3'
  filePath?: string | null
  thumbnailPath?: string | null
  bucket?: string | null
  objectKey?: string | null
  tags?: string[]
  metadata?: Record<string, unknown>
}

