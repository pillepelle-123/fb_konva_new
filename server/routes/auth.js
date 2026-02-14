const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

// Secure cookie options: httpOnly prevents XSS, secure enforces HTTPS in production, sameSite mitigates CSRF
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/'
};

function setAuthCookie(res, token) {
  res.cookie('auth_token', token, COOKIE_OPTS);
}

// Parse schema from DATABASE_URL
const url = new URL(process.env.DATABASE_URL);
const schema = url.searchParams.get('schema') || 'public';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Set search path from DATABASE_URL schema parameter
pool.on('connect', (client) => {
  client.query(`SET search_path TO ${schema}`);
});

// Register
router.post('/register', async (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(403).json({ error: 'Registration is currently disabled!' });
  }
  
  try {
    const { name, email, password } = req.body;
    
    const existingUser = await pool.query('SELECT id, name, email, role, password_hash, registered FROM public.users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      if (existingUser.rows[0].registered) {
        return res.status(400).json({ error: 'User already exists' });
      }
      // Convert temporary user to registered
      const hashedPassword = await bcrypt.hash(password, 10);
      const result = await pool.query(
        'UPDATE public.users SET name = $1, password_hash = $2, registered = true WHERE email = $3 RETURNING id, name, email, role',
        [name, hashedPassword, email]
      );
      const user = result.rows[0];
      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET);
      setAuthCookie(res, token);
      return res.json({ token, user });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO public.users (name, email, password_hash, registered) VALUES ($1, $2, $3, $4) RETURNING id, name, email, role',
      [name, email, hashedPassword, true]
    );
    
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET);
    setAuthCookie(res, token);
    res.json({ token, user });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    const result = await pool.query('SELECT id, name, email, role, password_hash, registered FROM public.users WHERE email = $1', [email]);
    const user = result.rows[0];
    
    if (!user || !await bcrypt.compare(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!user.registered) {
      return res.status(401).json({ error: 'Account not activated' });
    }
    
    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, process.env.JWT_SECRET);
    setAuthCookie(res, token);
    res.json({ 
      token, 
      user: { id: user.id, name: user.name, email: user.email, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout - clears auth cookie (client should also clear localStorage)
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/' });
  res.json({ success: true });
});

// Get current user
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name, email, role FROM public.users WHERE id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json({ user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;