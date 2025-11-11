const express = require('express')
const { Pool } = require('pg')
const { authenticateToken } = require('../../middleware/auth')
const { requireAdmin } = require('../../middleware/requireAdmin')

const router = express.Router()

const url = new URL(process.env.DATABASE_URL)
const schema = url.searchParams.get('schema') || 'public'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

pool.on('connect', (client) => {
  client.query(`SET search_path TO ${schema}`)
})

function parseListParam(value) {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

function mapBookRow(row) {
  return {
    id: row.id,
    name: row.name,
    ownerName: row.owner_name,
    status: row.admin_state,
    pageCount: Number(row.page_count) || 0,
    collaboratorCount: Number(row.collaborator_count) || 0,
    updatedAt: row.updated_at,
  }
}

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const pageSize = Math.min(parseInt(req.query.pageSize, 10) || 20, 100)
    const search = req.query.search ? String(req.query.search).trim() : ''
    const rawFilters = req.query.filters
    const filters = rawFilters && typeof rawFilters === 'object' ? rawFilters : {}

    let paramIndex = 1
    const values = []
    const whereClauses = []

    if (search) {
      values.push(`%${search}%`)
      whereClauses.push(`(b.name ILIKE $${paramIndex} OR owner.name ILIKE $${paramIndex})`)
      paramIndex += 1
    }

    const statusFilters = parseListParam(filters.status)
    if (statusFilters.length > 0) {
      values.push(statusFilters)
      whereClauses.push(`b.admin_state = ANY($${paramIndex})`)
      paramIndex += 1
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''

    const totalResult = await pool.query(
      `
        SELECT COUNT(*) AS count
        FROM ${schema}.books b
        LEFT JOIN ${schema}.users owner ON owner.id = b.owner_id
        ${whereSql}
      `,
      values,
    )

    values.push(pageSize)
    const limitIndex = paramIndex
    paramIndex += 1
    values.push((page - 1) * pageSize)

    const itemsResult = await pool.query(
      `
        SELECT
          b.id,
          b.name,
          COALESCE(owner.name, 'Unbekannt') AS owner_name,
          b.admin_state,
          b.updated_at,
          COALESCE(page_counts.total_pages, 0) AS page_count,
          COALESCE(collaborator_counts.total_collaborators, 0) AS collaborator_count
        FROM ${schema}.books b
        LEFT JOIN ${schema}.users owner ON owner.id = b.owner_id
        LEFT JOIN (
          SELECT book_id, COUNT(*) AS total_pages
          FROM ${schema}.pages
          GROUP BY book_id
        ) AS page_counts ON page_counts.book_id = b.id
        LEFT JOIN (
          SELECT book_id, COUNT(*) AS total_collaborators
          FROM ${schema}.book_friends
          GROUP BY book_id
        ) AS collaborator_counts ON collaborator_counts.book_id = b.id
        ${whereSql}
        ORDER BY b.updated_at DESC
        LIMIT $${limitIndex} OFFSET $${limitIndex + 1}
      `,
      values,
    )

    res.json({
      items: itemsResult.rows.map(mapBookRow),
      total: Number(totalResult.rows[0].count),
    })
  } catch (error) {
    console.error('Admin books fetch error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, status = 'draft' } = req.body

    if (!name) {
      return res.status(400).json({ error: 'Name ist erforderlich.' })
    }

    const adminState = status
    const archived = status === 'archived'

    const result = await pool.query(
      `
        INSERT INTO ${schema}.books (name, owner_id, admin_state, archived)
        VALUES ($1, $2, $3, $4)
        RETURNING id, name, admin_state, updated_at
      `,
      [name, req.user.id, adminState, archived],
    )

    const inserted = result.rows[0]
    const ownerResult = await pool.query(
      `SELECT name FROM ${schema}.users WHERE id = $1`,
      [req.user.id],
    )
    const ownerName = ownerResult.rows[0]?.name || 'Unbekannt'

    res.status(201).json({
      book: {
        id: inserted.id,
        name: inserted.name,
        ownerName,
        status: inserted.admin_state,
        pageCount: 0,
        collaboratorCount: 0,
        updatedAt: inserted.updated_at,
      },
    })
  } catch (error) {
    console.error('Admin book create error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

router.patch('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const bookId = parseInt(req.params.id, 10)
    if (Number.isNaN(bookId)) {
      return res.status(400).json({ error: 'Ungültige Buch-ID.' })
    }

    const { name, status } = req.body
    const updates = []
    const values = []
    let paramIndex = 1

    if (name) {
      updates.push(`name = $${paramIndex}`)
      values.push(name)
      paramIndex += 1
    }

    if (status) {
      updates.push(`admin_state = $${paramIndex}`)
      values.push(status)
      paramIndex += 1
      if (status === 'archived') {
        updates.push(`archived = TRUE`)
      } else {
        updates.push(`archived = FALSE`)
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Keine Änderungen übermittelt.' })
    }

    values.push(bookId)

    const result = await pool.query(
      `
        UPDATE ${schema}.books
        SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${paramIndex}
        RETURNING
          id,
          name,
          admin_state,
          updated_at,
          (SELECT name FROM ${schema}.users WHERE id = books.owner_id) AS owner_name,
          (SELECT COUNT(*) FROM ${schema}.pages WHERE book_id = books.id) AS page_count,
          (SELECT COUNT(*) FROM ${schema}.book_friends WHERE book_id = books.id) AS collaborator_count
      `,
      values,
    )

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Buch nicht gefunden.' })
    }

    res.json({ book: mapBookRow(result.rows[0]) })
  } catch (error) {
    console.error('Admin book update error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/bulk', authenticateToken, requireAdmin, async (req, res) => {
  const { action, ids } = req.body

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Keine IDs übermittelt.' })
  }

  try {
    if (action === 'delete') {
      await pool.query(`DELETE FROM ${schema}.books WHERE id = ANY($1)`, [ids])
      return res.json({ deletedIds: ids })
    }

    if (action === 'archive') {
      await pool.query(
        `
          UPDATE ${schema}.books
          SET admin_state = 'archived', archived = TRUE, updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1)
        `,
        [ids],
      )
    } else if (action === 'restore') {
      await pool.query(
        `
          UPDATE ${schema}.books
          SET admin_state = 'active', archived = FALSE, updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1)
        `,
        [ids],
      )
    } else {
      return res.status(400).json({ error: 'Unbekannte Aktion.' })
    }

    const refreshed = await pool.query(
      `
        SELECT
          b.id,
          b.name,
          COALESCE(owner.name, 'Unbekannt') AS owner_name,
          b.admin_state,
          b.updated_at,
          COALESCE(page_counts.total_pages, 0) AS page_count,
          COALESCE(collaborator_counts.total_collaborators, 0) AS collaborator_count
        FROM ${schema}.books b
        LEFT JOIN ${schema}.users owner ON owner.id = b.owner_id
        LEFT JOIN (
          SELECT book_id, COUNT(*) AS total_pages
          FROM ${schema}.pages
          GROUP BY book_id
        ) AS page_counts ON page_counts.book_id = b.id
        LEFT JOIN (
          SELECT book_id, COUNT(*) AS total_collaborators
          FROM ${schema}.book_friends
          GROUP BY book_id
        ) AS collaborator_counts ON collaborator_counts.book_id = b.id
        WHERE b.id = ANY($1)
      `,
      [ids],
    )

    res.json({ updated: refreshed.rows.map(mapBookRow) })
  } catch (error) {
    console.error('Admin book bulk action error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router

