const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

// Serialize user for the session
passport.serializeUser((user, done) => {
  done(null, user);
});

// Deserialize user from the session
passport.deserializeUser((user, done) => {
  done(null, user);
});

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || '/api/auth/google/callback',
        proxy: true // Important for Render deployment
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if the user's email matches the admin email
          const userEmail = profile.emails && profile.emails[0] ? profile.emails[0].value : null;
          
          if (!userEmail) {
            return done(null, false, { message: 'No email found in profile' });
          }

          // Check against the admin emails list
          const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
          
          if (!adminEmails.includes(userEmail.toLowerCase())) {
            return done(null, false, { message: 'Unauthorized: Not an admin' });
          }

          // User is an admin, create user object
          const user = {
            id: profile.id,
            email: userEmail,
            name: profile.displayName,
            picture: profile.photos && profile.photos[0] ? profile.photos[0].value : null
          };

          return done(null, user);
        } catch (error) {
          return done(error, null);
        }
      }
    )
  );
  console.log('Google OAuth strategy configured');
} else {
  console.warn('Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env');
}

module.exports = passport;

