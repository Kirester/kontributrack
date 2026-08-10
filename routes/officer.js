// routes/officer.js - Officer API routes for KontribuTrack (Protected by Session Auth)
// All routes require officer authentication via requireOfficerAuth middleware.

const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');

/**
 * ROUTE 1: GET /api/officer/members
 * Purpose: Fetch all members along with their current-month payment status.
 */
router.get('/members', async (req, res) => {
  try {
    const query = `
      SELECT 
        m.id, 
        m.name, 
        m.contact_number, 
        CAST(m.monthly_due AS DOUBLE) AS monthly_due,
        CASE WHEN COUNT(p.id) > 0 THEN 1 ELSE 0 END AS paid_this_month,
        COALESCE(SUM(CAST(p.amount AS DOUBLE)), 0) AS total_paid_this_month
      FROM members m
      LEFT JOIN payments p ON m.id = p.member_id 
        AND DATE_FORMAT(p.date_paid, '%Y-%m') = DATE_FORMAT(NOW(), '%Y-%m')
      GROUP BY m.id, m.name, m.contact_number, m.monthly_due
      ORDER BY m.name ASC
    `;

    const members = await db.all(query);
    res.json({ success: true, members });
  } catch (err) {
    console.error('[Error fetching members]:', err);
    res.status(500).json({ error: 'Internal server error while fetching members.' });
  }
});

/**
 * ROUTE 2: POST /api/officer/members
 * Purpose: Adds a new organization member with bcrypt hashed PIN.
 */
router.post('/members', async (req, res) => {
  try {
    const { name, contact_number, monthly_due, pin } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Member name is required.' });
    }
    if (monthly_due === undefined || isNaN(monthly_due) || Number(monthly_due) <= 0) {
      return res.status(400).json({ error: 'Valid monthly due amount is required.' });
    }
    if (!pin || String(pin).trim().length < 4) {
      return res.status(400).json({ error: 'PIN must be at least 4 digits.' });
    }

    const hashedPin = await bcrypt.hash(String(pin).trim(), 10);

    const result = await db.run(`
      INSERT INTO members (name, contact_number, monthly_due, pin)
      VALUES (?, ?, ?, ?)
    `, [
      name.trim(),
      contact_number ? contact_number.trim() : '',
      Number(monthly_due),
      hashedPin
    ]);

    res.status(201).json({
      success: true,
      message: 'Member added successfully.',
      member: {
        id: result.lastInsertRowid,
        name: name.trim(),
        contact_number: contact_number ? contact_number.trim() : '',
        monthly_due: Number(monthly_due)
      }
    });
  } catch (err) {
    console.error('[Error adding member]:', err);
    res.status(500).json({ error: 'Internal server error while adding member.' });
  }
});

/**
 * ROUTE 3: POST /api/officer/payments
 * Purpose: Logs a payment for a member with duplicate payment prevention.
 * NOTE: logged_by is automatically set from the authenticated officer's session!
 */
router.post('/payments', async (req, res) => {
  try {
    const { member_id, amount, date_paid, allow_duplicate } = req.body;

    // Retrieve logged_by identity directly from session (non-negotiable security requirement)
    const logged_by = req.session.officer ? req.session.officer.name : 'Officer';

    if (!member_id) {
      return res.status(400).json({ error: 'Audit trail error: member_id is required.' });
    }
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      return res.status(400).json({ error: 'Audit trail error: valid payment amount is required.' });
    }
    if (!date_paid || date_paid.trim() === '') {
      return res.status(400).json({ error: 'Audit trail error: date_paid is required.' });
    }

    const member = await db.get('SELECT * FROM members WHERE id = ?', [member_id]);
    if (!member) {
      return res.status(404).json({ error: 'Member not found.' });
    }

    // Duplicate check using MySQL DATE_FORMAT
    const existingPayment = await db.get(`
      SELECT id, amount, date_paid, logged_by 
      FROM payments 
      WHERE member_id = ? 
        AND DATE_FORMAT(date_paid, '%Y-%m') = DATE_FORMAT(?, '%Y-%m')
    `, [member_id, date_paid]);

    if (existingPayment && !allow_duplicate) {
      return res.status(409).json({
        error: 'Duplicate payment detected',
        message: `A payment of ₱${existingPayment.amount} was already logged for ${member.name} on ${existingPayment.date_paid} by ${existingPayment.logged_by}.`,
        existingPayment
      });
    }

    const timestamp = new Date().toISOString();

    const result = await db.run(`
      INSERT INTO payments (member_id, amount, date_paid, logged_by, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `, [
      member_id,
      Number(amount),
      date_paid,
      logged_by,
      timestamp
    ]);

    console.log(`[SMS SIMULATION] Payment of ₱${amount} logged for member "${member.name}" (${member.contact_number || 'No contact'}). Notification sent. Date: ${date_paid}, Logged by: ${logged_by}`);

    res.status(201).json({
      success: true,
      message: 'Payment logged successfully.',
      payment: {
        id: result.lastInsertRowid,
        member_id,
        member_name: member.name,
        amount: Number(amount),
        date_paid,
        logged_by,
        timestamp
      }
    });
  } catch (err) {
    console.error('[Error logging payment]:', err);
    res.status(500).json({ error: 'Internal server error while logging payment.' });
  }
});

module.exports = router;
