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

function mapPageRow(row) {
  return {
    id: row.id,
    bookId: row.book_id,
    bookName: row.book_name,
    pageNumber: row.page_number,
    assignedTo: row.assignee_name,
    assigneeId: row.assignee_id,
    status: row.admin_state,
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
      whereClauses.push(
        `(b.name ILIKE $${paramIndex} OR u.name ILIKE $${paramIndex} OR CAST(p.page_number AS TEXT) ILIKE $${paramIndex})`,
      )
      paramIndex += 1
    }

    const statusFilters = parseListParam(filters.status)
    if (statusFilters.length > 0) {
      values.push(statusFilters)
      whereClauses.push(`p.admin_state = ANY($${paramIndex})`)
      paramIndex += 1
    }

    const whereSql = whereClauses.length ? `WHERE ${whereClauses.join(' AND ')}` : ''

    const totalResult = await pool.query(
      `
        SELECT COUNT(*) AS count
        FROM ${schema}.pages p
        JOIN ${schema}.books b ON b.id = p.book_id
        LEFT JOIN LATERAL (
          SELECT pa.user_id, pa.assigned_by, pa.created_at
          FROM ${schema}.page_assignments pa
          WHERE pa.page_id = p.id
          ORDER BY pa.created_at DESC
          LIMIT 1
        ) latest_assignment ON TRUE
        LEFT JOIN ${schema}.users u ON u.id = latest_assignment.user_id
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
          p.id,
          p.book_id,
          b.name AS book_name,
          p.page_number,
          p.admin_state,
          p.created_at AS updated_at,
          latest_assignment.user_id AS assignee_id,
          u.name AS assignee_name
        FROM ${schema}.pages p
        JOIN ${schema}.books b ON b.id = p.book_id
        LEFT JOIN LATERAL (
          SELECT pa.user_id, pa.assigned_by, pa.created_at
          FROM ${schema}.page_assignments pa
          WHERE pa.page_id = p.id
          ORDER BY pa.created_at DESC
          LIMIT 1
        ) latest_assignment ON TRUE
        LEFT JOIN ${schema}.users u ON u.id = latest_assignment.user_id
        ${whereSql}
        ORDER BY p.created_at DESC
        LIMIT $${limitIndex} OFFSET $${limitIndex + 1}
      `,
      values,
    )

    res.json({
      items: itemsResult.rows.map(mapPageRow),
      total: Number(totalResult.rows[0].count),
    })
  } catch (error) {
    console.error('Admin pages fetch error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/bulk', authenticateToken, requireAdmin, async (req, res) => {
  const { action, ids, assigneeId } = req.body

  if (!Array.isArray(ids) || ids.length === 0) {
    return res.status(400).json({ error: 'Keine Seiten-IDs übermittelt.' })
  }

  const pageIds = ids
    .map((id) => parseInt(id, 10))
    .filter((value) => !Number.isNaN(value))

  if (pageIds.length === 0) {
    return res.status(400).json({ error: 'Ungültige Seiten-IDs.' })
  }

  const assignee = assigneeId ? parseInt(assigneeId, 10) : null

  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    if (action === 'assign') {
      await client.query(
        `DELETE FROM ${schema}.page_assignments WHERE page_id = ANY($1)`,
        [pageIds],
      )

      if (assignee) {
        const insertValues = pageIds
          .map(
            (pageId, index) =>
              `($${index + 1}, $${pageIds.length + 1}, (SELECT book_id FROM ${schema}.pages WHERE id = $${index + 1}), $${pageIds.length + 2})`,
          )
          .join(', ')

        await client.query(
          `
            INSERT INTO ${schema}.page_assignments (page_id, user_id, book_id, assigned_by)
            VALUES ${insertValues}
          `,
          [...pageIds, assignee, req.user.id],
        )
      }
    } else if (action === 'unassign') {
      await client.query(
        `DELETE FROM ${schema}.page_assignments WHERE page_id = ANY($1)`,
        [pageIds],
      )
    } else if (action === 'publish') {
      await client.query(
        `
          UPDATE ${schema}.pages
          SET admin_state = 'published'
          WHERE id = ANY($1)
        `,
        [pageIds],
      )
    } else {
      await client.query('ROLLBACK')
      return res.status(400).json({ error: 'Unbekannte Aktion.' })
    }

    if (action === 'assign' && !assignee) {
      await client.query(
        `
          UPDATE ${schema}.pages
          SET admin_state = 'draft'
          WHERE id = ANY($1)
        `,
        [pageIds],
      )
    } else if (action === 'assign' && assignee) {
      await client.query(
        `
          UPDATE ${schema}.pages
          SET admin_state = 'in_review'
          WHERE id = ANY($1) AND admin_state != 'published'
        `,
        [pageIds],
      )
    }

    await client.query('COMMIT')

    const refreshed = await pool.query(
      `
        SELECT
          p.id,
          p.book_id,
          b.name AS book_name,
          p.page_number,
          p.admin_state,
          p.created_at AS updated_at,
          latest_assignment.user_id AS assignee_id,
          u.name AS assignee_name
        FROM ${schema}.pages p
        JOIN ${schema}.books b ON b.id = p.book_id
        LEFT JOIN LATERAL (
          SELECT pa.user_id, pa.assigned_by, pa.created_at
          FROM ${schema}.page_assignments pa
          WHERE pa.page_id = p.id
          ORDER BY pa.created_at DESC
          LIMIT 1
        ) latest_assignment ON TRUE
        LEFT JOIN ${schema}.users u ON u.id = latest_assignment.user_id
        WHERE p.id = ANY($1)
      `,
      [pageIds],
    )

    res.json({ updated: refreshed.rows.map(mapPageRow) })
  } catch (error) {
    await client.query('ROLLBACK')
    console.error('Admin page bulk action error:', error)
    res.status(500).json({ error: 'Server error' })
  } finally {
    client.release()
  }
})

module.exports = router

