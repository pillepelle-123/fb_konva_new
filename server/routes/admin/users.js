const express = require('express')
const { Pool } = require('pg')
const bcrypt = require('bcryptjs')
const crypto = require('crypto')
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

function mapUserRow(row) {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    status: row.admin_state,
    createdAt: row.created_at,
    lastLoginAt: row.last_login_at || null,
  }
}

router.get('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1)
    const pageSize = Math.min(parseInt(req.query.pageSize, 10) || 20, 100)
    const search = req.query.search ? String(req.query.search).trim() : ''
    const sort = req.query.sort ? String(req.query.sort) : 'createdAt:desc'
    const rawFilters = req.query.filters
    const filters = rawFilters && typeof rawFilters === 'object' ? rawFilters : {}

    let paramIndex = 1
    const values = []
    const whereClauses = []

    if (search) {
      values.push(`%${search}%`)
      whereClauses.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`)
      paramIndex += 1
    }

    const roleFilters = parseListParam(filters.role)
    if (roleFilters.length > 0) {
      values.push(roleFilters)
      whereClauses.push(`u.role = ANY($${paramIndex})`)
      paramIndex += 1
    }

    const statusFilters = parseListParam(filters.status)
    if (statusFilters.length > 0) {
      values.push(statusFilters)
      whereClauses.push(`u.admin_state = ANY($${paramIndex})`)
      paramIndex += 1
    }

    const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : ''

    let orderSql = 'ORDER BY u.created_at DESC'
    if (sort) {
      const [field, direction] = sort.split(':')
      const dir = direction && direction.toLowerCase() === 'asc' ? 'ASC' : 'DESC'
      switch (field) {
        case 'name':
          orderSql = `ORDER BY u.name ${dir}`
          break
        case 'email':
          orderSql = `ORDER BY u.email ${dir}`
          break
        case 'role':
          orderSql = `ORDER BY u.role ${dir}`
          break
        case 'status':
          orderSql = `ORDER BY u.admin_state ${dir}`
          break
        case 'createdAt':
        default:
          orderSql = `ORDER BY u.created_at ${dir}`
          break
      }
    }

    const totalResult = await pool.query(
      `SELECT COUNT(*) AS count FROM ${schema}.users u ${whereSql}`,
      values,
    )

    values.push(pageSize)
    const limitParamIndex = paramIndex
    paramIndex += 1
    values.push((page - 1) * pageSize)

    const usersResult = await pool.query(
      `
        SELECT 
          u.id,
          u.name,
          u.email,
          u.role,
          u.admin_state,
          u.created_at,
          NULL::timestamp AS last_login_at
        FROM ${schema}.users u
        ${whereSql}
        ${orderSql}
        LIMIT $${limitParamIndex} OFFSET $${limitParamIndex + 1}
      `,
      values,
    )

    res.json({
      items: usersResult.rows.map(mapUserRow),
      total: Number(totalResult.rows[0].count),
    })
  } catch (error) {
    console.error('Admin users fetch error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

router.post('/', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, role = 'user', status = 'invited' } = req.body

    if (!name || !email) {
      return res.status(400).json({ error: 'Name und E-Mail sind erforderlich.' })
    }

    const passwordSeed = crypto.randomBytes(16).toString('hex')
    const passwordHash = await bcrypt.hash(passwordSeed, 10)
    const invitationToken = status === 'invited' ? crypto.randomUUID() : null
    const registered = status === 'active'

    const result = await pool.query(
      `
        INSERT INTO ${schema}.users (name, email, password_hash, role, registered, invitation_token, admin_state)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING id, name, email, role, admin_state, created_at,
          NULL::timestamp AS last_login_at
      `,
      [name, email, passwordHash, role, registered, invitationToken, status],
    )

    res.status(201).json({ user: mapUserRow(result.rows[0]) })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'E-Mail ist bereits vergeben.' })
    }
    console.error('Admin user create error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

router.patch('/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const userId = parseInt(req.params.id, 10)
    const { name, email, role, status } = req.body

    if (Number.isNaN(userId)) {
      return res.status(400).json({ error: 'Ungültige Benutzer-ID.' })
    }

    const fields = []
    const values = []
    let paramIndex = 1

    if (name) {
      fields.push(`name = $${paramIndex}`)
      values.push(name)
      paramIndex += 1
    }

    if (email) {
      fields.push(`email = $${paramIndex}`)
      values.push(email)
      paramIndex += 1
    }

    if (role) {
      fields.push(`role = $${paramIndex}`)
      values.push(role)
      paramIndex += 1
    }

    if (status) {
      fields.push(`admin_state = $${paramIndex}`)
      values.push(status)
      paramIndex += 1

      if (status === 'active') {
        fields.push(`registered = TRUE`, `invitation_token = NULL`)
      } else if (status === 'invited') {
        fields.push(`registered = FALSE`, `invitation_token = COALESCE(invitation_token, uuid_generate_v4())`)
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({ error: 'Keine Änderungen übermittelt.' })
    }

    values.push(userId)

    const updateSql = `
      UPDATE ${schema}.users
      SET ${fields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, email, role, admin_state, created_at, NULL::timestamp AS last_login_at
    `

    const result = await pool.query(updateSql, values)

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Benutzer:in nicht gefunden.' })
    }

    res.json({ user: mapUserRow(result.rows[0]) })
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'E-Mail ist bereits vergeben.' })
    }
    console.error('Admin user update error:', error)
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
      await pool.query(`DELETE FROM ${schema}.users WHERE id = ANY($1)`, [ids])
      return res.json({ deletedIds: ids })
    }

    if (action === 'activate') {
      await pool.query(
        `
          UPDATE ${schema}.users
          SET admin_state = 'active', registered = TRUE, invitation_token = NULL
          WHERE id = ANY($1)
        `,
        [ids],
      )
    } else if (action === 'suspend') {
      await pool.query(
        `
          UPDATE ${schema}.users
          SET admin_state = 'suspended'
          WHERE id = ANY($1)
        `,
        [ids],
      )
    } else {
      return res.status(400).json({ error: 'Unbekannte Aktion.' })
    }

    const refreshed = await pool.query(
      `
        SELECT id, name, email, role, admin_state, created_at, NULL::timestamp AS last_login_at
        FROM ${schema}.users
        WHERE id = ANY($1)
      `,
      [ids],
    )

    res.json({ updated: refreshed.rows.map(mapUserRow) })
  } catch (error) {
    console.error('Admin user bulk action error:', error)
    res.status(500).json({ error: 'Server error' })
  }
})

module.exports = router

