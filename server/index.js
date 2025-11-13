const express = require('express');
const cors = require('cors');
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

// Middleware
app.use(cors());
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

// Static file serving
const UPLOADS_DIR =
  process.env.UPLOADS_DIR ||
  path.join(__dirname, '..', 'uploads');
app.use('/uploads', express.static(UPLOADS_DIR));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/books', require('./routes/books'));
app.use('/api/questions', require('./routes/questions'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/images', require('./routes/images'));
app.use('/api/page-assignments', require('./routes/page-assignments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/friendships', require('./routes/friendships'));
app.use('/api/friends', require('./routes/friends'));
app.use('/api/answers', require('./routes/answers'));
app.use('/api/messenger', require('./routes/messenger'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/editor-settings', require('./routes/editor-settings'));
app.use('/api/user-question-assignments', require('./routes/user-question-assignments'));
app.use('/api/invitations', require('./routes/invitations'));
app.use('/api/question-pool', require('./routes/question-pool'));
app.use('/api/templates', require('./routes/templates'));
app.use('/api/color-palettes', require('./routes/templates'));
app.use('/api/pages', require('./routes/templates'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/background-images', require('./routes/background-images'));

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
  // console.log(`Server running on port ${PORT}`);
});