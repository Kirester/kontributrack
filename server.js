// server.js - Main Express server entry point for KontribuTrack
// Serves static files for the treasurer/officer dashboard and handles API routes.

require('dotenv').config();
const express = require('express');
const path = require('path');
const db = require('./db');
const officerRoutes = require('./routes/officer');

const app = express();
const PORT = process.env.PORT || 3000;

// Body parsing middleware (JSON payloads)
app.use(express.json());

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Mount Officer/Treasurer routes under /api/officer namespace
app.use('/api/officer', officerRoutes);

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
