// server.js - Main Express server entry point for KontribuTrack
// Serves static files for the treasurer/officer dashboard and handles API routes.

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db');
const authRoutes = require('./routes/auth');
const officerRoutes = require('./routes/officer');
const memberRoutes = require('./routes/member');
const { requireOfficerAuth } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing middleware (JSON payloads)
app.use(express.json());

// Session management middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'kontributrack_secret_key_fallback',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true
  }
}));

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Mount Auth routes (Login, Logout, Session check)
app.use('/api/auth', authRoutes);

// Mount Public Member Self-Check routes (UNPROTECTED, NO OFFICER SESSION REQUIRED)
app.use('/api/member', memberRoutes);

// Mount Officer/Treasurer routes under /api/officer namespace (Protected by Auth Guard)
app.use('/api/officer', requireOfficerAuth, officerRoutes);

// Root route fallback -> index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start Express HTTP server after initializing database
async function startServer() {
  await db.initDb();
  app.listen(PORT, () => {
    console.log(`[KontribuTrack] Server running at http://localhost:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
