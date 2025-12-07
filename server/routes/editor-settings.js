const express = require('express');
const { Pool } = require('pg');
const { authenticateToken: auth } = require('../middleware/auth');

const router = express.Router();

// Parse schema from DATABASE_URL
let schema = 'public';
try {
  const url = new URL(process.env.DATABASE_URL);
  schema = url.searchParams.get('schema') || 'public';
} catch (error) {
  // If DATABASE_URL is not a valid URL format (e.g., direct connection string),
  // default to 'public' schema
  console.warn('Could not parse DATABASE_URL as URL, defaulting to public schema:', error.message);
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

// Set search path from DATABASE_URL schema parameter
pool.on('connect', (client) => {
  client.query(`SET search_path TO ${schema}`);
});

// Get editor settings for user and book
router.get('/:bookId', auth, async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'SELECT setting_type, setting_key, setting_value FROM public.editor_settings WHERE user_id = $1 AND book_id = $2',
      [userId, bookId]
    );

    const settings = {};
    result.rows.forEach(row => {
      if (!settings[row.setting_type]) {
        settings[row.setting_type] = {};
      }
      settings[row.setting_type][row.setting_key] = JSON.parse(row.setting_value);
    });

    res.json(settings);
  } catch (error) {
    console.error('Error fetching editor settings:', error);
    res.status(500).json({ error: 'Failed to fetch editor settings' });
  }
});

// Save editor setting
router.post('/:bookId', auth, async (req, res) => {
  try {
    const { bookId } = req.params;
    const userId = req.user.id;
    const { settingType, settingKey, settingValue } = req.body;

    await pool.query(
      `INSERT INTO public.editor_settings (user_id, book_id, setting_type, setting_key, setting_value, updated_at)
       VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)
       ON CONFLICT (user_id, book_id, setting_type, setting_key)
       DO UPDATE SET setting_value = $5, updated_at = CURRENT_TIMESTAMP`,
      [userId, bookId, settingType, settingKey, JSON.stringify(settingValue)]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error saving editor setting:', error);
    res.status(500).json({ error: 'Failed to save editor setting' });
  }
});

// Delete editor setting
router.delete('/:bookId/:settingType/:settingKey', auth, async (req, res) => {
  try {
    const { bookId, settingType, settingKey } = req.params;
    const userId = req.user.id;

    await pool.query(
      'DELETE FROM public.editor_settings WHERE user_id = $1 AND book_id = $2 AND setting_type = $3 AND setting_key = $4',
      [userId, bookId, settingType, settingKey]
    );

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting editor setting:', error);
    res.status(500).json({ error: 'Failed to delete editor setting' });
  }
});

module.exports = router;