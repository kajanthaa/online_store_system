// Middleware to ensure user is logged in as Admin
function requireAuth(req, res, next) {
  if (req.session && req.session.user) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: 'Unauthorized: Please login to access this protected admin resource.'
  });
}

module.exports = { requireAuth };
