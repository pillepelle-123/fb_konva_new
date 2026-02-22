const express = require('express');
const { Pool } = require('pg');
const { authenticateToken: auth } = require('../middleware/auth');

const router = express.Router();

let schema = 'public';
try {
  const url = new URL(process.env.DATABASE_URL);
  schema = url.searchParams.get('schema') || 'public';
} catch (error) {
  console.warn('Could not parse DATABASE_URL as URL, defaulting to public schema:', error.message);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

pool.on('connect', (client) => {
  client.query(`SET search_path TO ${schema}`);
});

// GET /api/sandbox-page – list all sandbox pages for the current user (id, name, updated_at)
router.get('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT id, name, updated_at FROM public.sandbox_page
       WHERE user_id = $1
       ORDER BY updated_at DESC`,
      [userId]
    );
    res.json({ pages: result.rows });
  } catch (error) {
    console.error('Error fetching sandbox pages:', error);
    res.status(500).json({ error: 'Failed to fetch sandbox pages' });
  }
});

// GET /api/sandbox-page/:id – get one sandbox page with full page_data
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid sandbox page id' });
    }
    const result = await pool.query(
      `SELECT id, name, page_data, updated_at FROM public.sandbox_page
       WHERE id = $1 AND user_id = $2`,
      [id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sandbox page not found' });
    }
    const row = result.rows[0];
    res.json({
      id: row.id,
      name: row.name,
      page: row.page_data?.page,
      sandboxColors: row.page_data?.sandboxColors,
      partSlotOverrides: row.page_data?.partSlotOverrides ?? {},
      pageSlotOverrides: row.page_data?.pageSlotOverrides ?? {},
      updated_at: row.updated_at
    });
  } catch (error) {
    console.error('Error fetching sandbox page:', error);
    res.status(500).json({ error: 'Failed to fetch sandbox page' });
  }
});

// POST /api/sandbox-page – create new sandbox page
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { name, page, sandboxColors, partSlotOverrides, pageSlotOverrides } = req.body;
    if (!page) {
      return res.status(400).json({ error: 'page is required' });
    }
    const pageData = {
      page,
      sandboxColors: sandboxColors ?? {},
      partSlotOverrides: partSlotOverrides ?? {},
      pageSlotOverrides: pageSlotOverrides ?? {}
    };
    const result = await pool.query(
      `INSERT INTO public.sandbox_page (user_id, name, page_data, updated_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id, name, updated_at`,
      [userId, (name && String(name).trim()) || 'Unbenannt', JSON.stringify(pageData)]
    );
    const row = result.rows[0];
    res.status(201).json({ id: row.id, name: row.name, updated_at: row.updated_at });
  } catch (error) {
    console.error('Error creating sandbox page:', error);
    res.status(500).json({ error: 'Failed to save sandbox page' });
  }
});

// PUT /api/sandbox-page/:id – update existing sandbox page
router.put('/:id', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return res.status(400).json({ error: 'Invalid sandbox page id' });
    }
    const { name, page, sandboxColors, partSlotOverrides, pageSlotOverrides } = req.body;
    if (!page) {
      return res.status(400).json({ error: 'page is required' });
    }
    const pageData = {
      page,
      sandboxColors: sandboxColors ?? {},
      partSlotOverrides: partSlotOverrides ?? {},
      pageSlotOverrides: pageSlotOverrides ?? {}
    };
    const result = await pool.query(
      `UPDATE public.sandbox_page
       SET name = $1, page_data = $2, updated_at = CURRENT_TIMESTAMP
       WHERE id = $3 AND user_id = $4
       RETURNING id, name, updated_at`,
      [(name && String(name).trim()) || 'Unbenannt', JSON.stringify(pageData), id, userId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sandbox page not found' });
    }
    const row = result.rows[0];
    res.json({ id: row.id, name: row.name, updated_at: row.updated_at });
  } catch (error) {
    console.error('Error updating sandbox page:', error);
    res.status(500).json({ error: 'Failed to update sandbox page' });
  }
});

module.exports = router;
