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
app.set('trust proxy', 1); // Trust reverse proxies (e.g. Cloudflare / trycloudflare tunnel)
const PORT = process.env.PORT || 3000;

// Body parsing middleware (JSON payloads)
app.use(express.json());

// Session management middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'kontributrack_secret_key_fallback',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    httpOnly: true,
    sameSite: 'lax'
  }
}));

// Helper: Auto-detect machine's IPv4 local network IP address
function getLocalNetworkIp() {
  const interfaces = os.networkInterfaces();
  let candidateIp = null;
  for (const name of Object.keys(interfaces)) {
    const lowerName = name.toLowerCase();
    // Skip virtual interfaces (WSL, Hyper-V, VirtualBox, VMware, Docker)
    if (lowerName.includes('wsl') || lowerName.includes('vbox') || lowerName.includes('virtual') || lowerName.includes('vethernet') || lowerName.includes('vmware') || lowerName.includes('host-only')) {
      continue;
    }
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        if (iface.address.startsWith('192.168.56.')) continue; // Skip VirtualBox Host-Only subnet
        if (lowerName.includes('wi-fi') || lowerName.includes('wifi') || lowerName.includes('wireless')) {
          return iface.address;
        }
        if (!candidateIp) candidateIp = iface.address;
      }
    }
  }
  return candidateIp || '127.0.0.1';
}

// Serve static frontend files from 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

const QRCode = require('qrcode');

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

// Server-side QR Code Generation Endpoint (Offline capable base64 PNG data URL)
app.get('/api/qr', async (req, res) => {
  try {
    const text = req.query.text;
    if (!text) {
      return res.status(400).json({ error: 'Text query parameter is required.' });
    }
    const dataUrl = await QRCode.toDataURL(text, { width: 300, margin: 1 });
    res.json({ success: true, dataUrl });
  } catch (err) {
    console.error('Server QR generation error:', err);
    res.status(500).json({ error: 'Failed to generate QR code.' });
  }
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
