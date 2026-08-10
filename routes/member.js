// routes/member.js - Public Member Self-Check API routes for KontribuTrack
// NOTE: Completely separate from officer routes (per AGENTS.md rules).
// No officer session required. Includes anti-enumeration protection.

const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');

/**
 * ROUTE: POST /api/member/check-status
 * Purpose: Allows a member to check their current-month contribution status using their Member ID and PIN.
 * Anti-Enumeration Rule: If member ID is invalid OR PIN is wrong, returns the EXACT SAME generic error message.
 */
router.post('/check-status', async (req, res) => {
  const genericErrorMessage = 'Invalid Member ID or PIN.';

  try {
    const { member_id, pin } = req.body;

    // Basic input validation
    if (!member_id || isNaN(member_id) || !pin || String(pin).trim() === '') {
      return res.status(401).json({ error: genericErrorMessage });
    }

    const memberIdNum = parseInt(member_id, 10);
    const pinStr = String(pin).trim();

    // Query member details from database
    const member = await db.get(
      'SELECT id, name, CAST(monthly_due AS DOUBLE) AS monthly_due, pin FROM members WHERE id = ?',
      [memberIdNum]
    );

    // Security Check 1: If member does not exist -> Return generic error
    if (!member) {
      return res.status(401).json({ error: genericErrorMessage });
    }

    // Security Check 2: Verify PIN against stored bcrypt hash
    const pinValid = await bcrypt.compare(pinStr, member.pin);

    // If PIN invalid -> Return exact same generic error (prevents member ID enumeration)
    if (!pinValid) {
      return res.status(401).json({ error: genericErrorMessage });
    }

    // PIN verified successfully! Query payment details:
    // 1. Current month payment check
    const currentMonthPayment = await db.get(`
      SELECT id, amount, date_paid 
      FROM payments 
      WHERE member_id = ? 
        AND DATE_FORMAT(date_paid, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
      ORDER BY id DESC LIMIT 1
    `, [memberIdNum]);

    // 2. Overall last payment date
    const lastPayment = await db.get(`
      SELECT date_paid 
      FROM payments 
      WHERE member_id = ? 
      ORDER BY id DESC LIMIT 1
    `, [memberIdNum]);

    // Return status payload
    return res.json({
      success: true,
      member: {
        id: member.id,
        name: member.name,
        monthly_due: member.monthly_due,
        paid_this_month: Boolean(currentMonthPayment),
        last_payment_date: lastPayment ? lastPayment.date_paid : null
      }
    });

  } catch (err) {
    console.error('[Error in member check-status]:', err);
    return res.status(500).json({ error: 'Internal server error while checking payment status.' });
  }
});

module.exports = router;
