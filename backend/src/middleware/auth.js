// Middleware to check if user is authenticated
function isAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  
  res.status(401).json({
    success: false,
    error: 'Unauthorized',
    message: 'You must be logged in to access this resource'
  });
}

// Middleware to check if user is an admin
function isAdmin(req, res, next) {
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized',
      message: 'You must be logged in to access this resource'
    });
  }

  const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
  const userEmail = req.user?.email?.toLowerCase();

  if (!userEmail || !adminEmails.includes(userEmail)) {
    return res.status(403).json({
      success: false,
      error: 'Forbidden',
      message: 'You do not have permission to access this resource'
    });
  }

  next();
}

module.exports = {
  isAuthenticated,
  isAdmin
};

