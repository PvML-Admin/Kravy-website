const express = require('express');
const router = express.Router();
const passport = require('../config/passport');

// Check if OAuth is configured
const isOAuthConfigured = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// Initiate Google OAuth login
router.get('/google', (req, res, next) => {
  if (!isOAuthConfigured) {
    return res.status(503).json({
      success: false,
      error: 'OAuth not configured',
      message: 'Google OAuth is not configured on the server'
    });
  }
  
  passport.authenticate('google', {
    scope: ['profile', 'email']
  })(req, res, next);
});

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: (process.env.FRONTEND_URL || 'http://localhost:3000') + '/login?error=auth_failed',
    failureMessage: true
  }),
  (req, res) => {
    console.log('OAuth callback successful, user:', req.user?.email);
    console.log('Session ID:', req.sessionID);
    
    // Successful authentication, redirect to admin panel
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    res.redirect(frontendUrl + '/admin/add-members');
  }
);

// Get current user
router.get('/user', (req, res) => {
  console.log('GET /user - Session ID:', req.sessionID, 'Authenticated:', req.isAuthenticated?.());
  console.log('GET /user - User:', req.user);
  
  if (req.isAuthenticated && req.isAuthenticated()) {
    res.json({
      success: true,
      user: req.user
    });
  } else {
    res.status(401).json({
      success: false,
      user: null
    });
  }
});

// Check auth status
router.get('/status', (req, res) => {
  const authenticated = req.isAuthenticated ? req.isAuthenticated() : false;
  console.log('GET /status - Session ID:', req.sessionID, 'Authenticated:', authenticated);
  console.log('GET /status - User:', req.user);
  
  res.json({
    success: true,
    authenticated,
    configured: isOAuthConfigured,
    user: authenticated ? req.user : null
  });
});

// Logout
router.post('/logout', (req, res, next) => {
  req.logout((err) => {
    if (err) {
      return next(err);
    }
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({
          success: false,
          error: 'Failed to logout'
        });
      }
      res.clearCookie('connect.sid');
      res.json({
        success: true,
        message: 'Logged out successfully'
      });
    });
  });
});

module.exports = router;

