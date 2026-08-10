// middleware/auth.js - Officer authentication guard middleware
// Ensures only authenticated officers can access protected API endpoints.

function requireOfficerAuth(req, res, next) {
  if (req.session && req.session.officer) {
    return next();
  }

  return res.status(401).json({
    error: 'Authentication required. Please log in as an officer.',
    code: 'UNAUTHENTICATED'
  });
}

module.exports = { requireOfficerAuth };
