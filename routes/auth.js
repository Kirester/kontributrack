// routes/auth.js - Officer authentication routes (Login, Logout, Session check)
const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');

/**
 * POST /api/auth/login
 * Purpose: Authenticates officer using username & password.
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || username.trim() === '') {
      return res.status(400).json({ error: 'Username is required.' });
    }
    if (!password || password.trim() === '') {
      return res.status(400).json({ error: 'Password is required.' });
    }

    // Query officer from database
    const officer = await db.get(
      'SELECT id, username, password, name FROM officers WHERE username = ?',
      [username.trim()]
    );

    if (!officer) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Verify password using bcrypt
    const passwordValid = await bcrypt.compare(String(password).trim(), officer.password);
    if (!passwordValid) {
      return res.status(401).json({ error: 'Invalid username or password.' });
    }

    // Establish session and ensure it is saved before returning HTTP response
    req.session.officer = {
      id: officer.id,
      username: officer.username,
      name: officer.name
    };

    req.session.save((err) => {
      if (err) {
        console.error('[Error saving session]:', err);
        return res.status(500).json({ error: 'Failed to establish session.' });
      }

      console.log(`[AUTH] Officer "${officer.name}" (${officer.username}) logged in successfully.`);

      return res.json({
        success: true,
        message: 'Login successful.',
        officer: {
          id: officer.id,
          username: officer.username,
          name: officer.name
        }
      });
    });
  } catch (err) {
    console.error('[Error during login]:', err);
    return res.status(500).json({ error: 'Internal server error during login.' });
  }
});

/**
 * POST /api/auth/logout
 * Purpose: Destroys current officer session.
 */
router.post('/logout', (req, res) => {
  const officerName = req.session && req.session.officer ? req.session.officer.name : 'Officer';
  req.session.destroy((err) => {
    if (err) {
      console.error('[Error during logout]:', err);
      return res.status(500).json({ error: 'Could not log out. Please try again.' });
    }
    res.clearCookie('connect.sid');
    console.log(`[AUTH] "${officerName}" logged out.`);
    return res.json({ success: true, message: 'Logged out successfully.' });
  });
});

/**
 * GET /api/auth/me
 * Purpose: Returns current session state for the frontend.
 */
router.get('/me', (req, res) => {
  if (req.session && req.session.officer) {
    return res.json({
      loggedIn: true,
      officer: req.session.officer
    });
  }
  return res.json({
    loggedIn: false,
    officer: null
  });
});

module.exports = router;
