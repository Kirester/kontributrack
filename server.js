// server.js - Main Express server entry point for KontribuTrack
// Serves static files for the treasurer/officer dashboard and handles API routes.

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const os = require('os');
const db = require('./db');
const authRoutes = require('./routes/auth');
const officerRoutes = require('./routes/officer');
const memberRoutes = require('./routes/member');
const { requireOfficerAuth } = require('./middleware/auth');

process.on('uncaughtException', (err) => {
  console.error('[UNCAUGHT EXCEPTION]:', err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('[UNHANDLED REJECTION]:', reason);
});


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

// Helper: Auto-detect machine's IPv4 local network IP address
function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    const lowerName = name.toLowerCase();
    // Skip virtual interfaces (WSL, Hyper-V, VirtualBox, Docker)
    if (lowerName.includes('wsl') || lowerName.includes('vbox') || lowerName.includes('virtual') || lowerName.includes('vethernet')) {
      continue;
    }
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1';
}

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Public Configuration endpoint for QR code base URL resolution
app.get('/api/config', (req, res) => {
  const detectedIp = getLocalNetworkIp();
  const defaultUrl = `http://${detectedIp}:${PORT}`;
  const appUrl = (process.env.APP_URL && process.env.APP_URL.trim() !== '')
    ? process.env.APP_URL.trim()
    : defaultUrl;

  res.json({
    app_url: appUrl,
    detected_ip: detectedIp,
    port: PORT
  });
});

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
  app.listen(PORT, '0.0.0.0', () => {
    const localIp = getLocalNetworkIp();
    const appUrl = (process.env.APP_URL && process.env.APP_URL.trim() !== '')
      ? process.env.APP_URL.trim()
      : `http://${localIp}:${PORT}`;

    console.log(`[KontribuTrack] Server running!`);
    console.log(` -> Local Computer URL: http://localhost:${PORT}`);
    console.log(` -> Network / Mobile URL: ${appUrl}`);
    console.log(` -> QR Codes will encode: ${appUrl}/check-status.html?id={member_id}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
