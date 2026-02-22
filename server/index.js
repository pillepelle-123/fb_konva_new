const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { Pool } = require('pg');
const { createServer } = require('http');
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 5000;

// Middleware - credentials: true allows cookies for cross-origin (e.g. dev)
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173", credentials: true }));
app.use(cookieParser());
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));

// Debug: Request counting to find rate-limit culprits (enable with DEBUG_RATE_LIMIT=1)
const DEBUG_RATE_LIMIT = process.env.DEBUG_RATE_LIMIT === '1';
const requestCounts = new Map(); // path pattern -> count
let totalApiRequests = 0;

function normalizePath(p) {
  // Group similar endpoints for clearer stats
  if (/^\/api\/background-images\/[^/]+\/file$/.test(p)) return 'background-images/:id/file';
  if (/^\/api\/stickers\/[^/]+\/file$/.test(p)) return 'stickers/:id/file';
  if (/^\/api\/background-images\?/.test(p)) return 'background-images (list)';
  if (/^\/api\/stickers\?/.test(p)) return 'stickers (list)';
  if (/^\/api\/books\/\d+$/.test(p)) return 'books/:id';
  if (/^\/api\/users\/\d+$/.test(p)) return 'users/:id';
  if (/^\/api\/images\/file\/\d+$/.test(p)) return 'images/file/:id';
  return p.replace(/^\/api/, '').replace(/\d+/g, ':id') || p;
}

app.use('/api', (req, res, next) => {
  const pattern = normalizePath(req.path);
  const prev = requestCounts.get(pattern) || 0;
  requestCounts.set(pattern, prev + 1);
  totalApiRequests++;
  if (DEBUG_RATE_LIMIT) {
    console.log(`[REQ ${totalApiRequests}] ${req.method} ${req.path}`);
  }
  if (totalApiRequests === 100 || totalApiRequests === 140 || totalApiRequests === 150) {
    const sorted = [...requestCounts.entries()].sort((a, b) => b[1] - a[1]);
    console.log(`\n--- Rate limit debug: ${totalApiRequests} requests (top endpoints) ---`);
    sorted.slice(0, 15).forEach(([p, c]) => console.log(`  ${c}x  ${p}`));
    console.log('---\n');
  }
  next();
});

// Global API rate limiting (disable in dev with DISABLE_RATE_LIMIT=1 in .env)
const RATE_LIMIT_DISABLED = process.env.DISABLE_RATE_LIMIT === '1' || process.env.DISABLE_RATE_LIMIT === 'true';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: parseInt(process.env.API_RATE_LIMIT_MAX || '150', 10),
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, _next, options) => {
    const sorted = [...requestCounts.entries()].sort((a, b) => b[1] - a[1]);
    console.log('\n!!! RATE LIMIT (429) - Top request sources:');
    sorted.slice(0, 10).forEach(([p, c]) => console.log(`  ${c}x  ${p}`));
    console.log('');
    res.status(429).json(options.message);
  },
  // Skip endpoints that are polled, loaded frequently, or essential for UI
  skip: (req) => {
    if (RATE_LIMIT_DISABLED) return true;
    const p = req.path || req.originalUrl || '';
    return p.includes('profile-picture') ||
      /\/users\/\d+$/.test(p) ||
      p.includes('unread-count') ||
      p.includes('pdf-exports/recent') ||
      p.includes('debug/request-stats') ||
      p.includes('background-images') ||
      p.includes('stickers') ||
      p.includes('messenger/conversations');
  }
});
if (!RATE_LIMIT_DISABLED) {
  app.use('/api', apiLimiter);
}

// Debug endpoint: GET /api/debug/request-stats (excluded from rate limit)
app.get('/api/debug/request-stats', (_req, res) => {
  const sorted = [...requestCounts.entries()].sort((a, b) => b[1] - a[1]);
  res.json({
    totalApiRequests,
    byEndpoint: Object.fromEntries(sorted),
    top10: sorted.slice(0, 10).map(([p, c]) => ({ endpoint: p, count: c }))
  });
});

// Increase JSON body size limit to 50MB for large books (64+ pages with many elements)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Test database connection
pool.connect((err, client, release) => {
  if (err) {
    console.error('Error connecting to database:', err.stack);
  } else {
    // console.log('Connected to PostgreSQL database');
    release();
  }
});

// Block ALL direct access to /uploads - must use authenticated API endpoints
app.use('/uploads', (_req, res) => {
  res.status(403).json({ error: 'Use authenticated API to access uploads' });
});

// PDF Renderer static assets
const CLIENT_DIST_DIR = path.join(__dirname, '..', 'client', 'dist');
app.get('/pdf-renderer.iife.js', (req, res) => {
  res.sendFile(path.join(CLIENT_DIST_DIR, 'pdf-renderer.iife.js'));
});

// PDF Renderer HTML template
const TEMPLATES_DIR = path.join(__dirname, 'templates');
app.get('/pdf-renderer.html', (req, res) => {
  res.sendFile(path.join(TEMPLATES_DIR, 'pdf-renderer.html'));
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/images', require('./routes/images'));
app.use('/api/page-assignments', require('./routes/page-assignments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/friendships', require('./routes/friendships'));
app.use('/api/friend-invitations', require('./routes/friend-invitations'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/user-blocks', require('./routes/user-blocks'));
app.use('/api/answers', require('./routes/answers'));
app.use('/api/messenger', require('./routes/messenger'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/editor-settings', require('./routes/editor-settings'));
app.use('/api/sandbox-page', require('./routes/sandbox-page'));
app.use('/api/user-question-assignments', require('./routes/user-question-assignments'));
app.use('/api/invitations', require('./routes/invitations'));
app.use('/api/question-pool', require('./routes/question-pool'));
app.use('/api/templates', require('./routes/templates'));
const { themesRouter, colorPalettesRouter, layoutsRouter } = require('./routes/themes-palettes-layouts');
app.use('/api/themes', themesRouter);
app.use('/api/color-palettes', colorPalettesRouter);
app.use('/api/layouts', layoutsRouter);
app.use('/api/pages', require('./routes/templates'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/background-images', require('./routes/background-images'));
app.use('/api/stickers', require('./routes/stickers'));
app.use('/api/pdf-exports', require('./routes/pdf-exports'));

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication error'));
  }
  
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (err) {
    next(new Error('Authentication error'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  // console.log(`User ${socket.userId} connected`);
  
  // Join user to their own room for notifications
  socket.join(`user_${socket.userId}`);
  
  // Join conversation rooms
  socket.on('join_conversation', (conversationId) => {
    socket.join(`conversation_${conversationId}`);
  });
  
  // Leave conversation rooms
  socket.on('leave_conversation', (conversationId) => {
    socket.leave(`conversation_${conversationId}`);
  });
  
  // Handle typing indicators
  socket.on('typing', ({ conversationId, isTyping }) => {
    socket.to(`conversation_${conversationId}`).emit('user_typing', {
      userId: socket.userId,
      isTyping
    });
  });
  
  socket.on('disconnect', () => {
    // console.log(`User ${socket.userId} disconnected`);
  });
});

// Make io available to routes
app.set('io', io);

app.get('/', (req, res) => {
  res.json({ message: 'Hello World from Express server!' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

server.listen(PORT, () => {
  if (DEBUG_RATE_LIMIT) {
    console.log(`[DEBUG] Rate limit logging enabled. Stats: http://localhost:${PORT}/api/debug/request-stats`);
  }
});