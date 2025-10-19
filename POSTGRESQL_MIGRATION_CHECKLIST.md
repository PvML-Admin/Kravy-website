# PostgreSQL Migration Checklist ✅

Use this checklist to migrate your Kravy Tracker from SQLite to PostgreSQL on Render.

## Pre-Migration

- [ ] **Backup your SQLite database** (copy `backend/database/clan.db` to a safe location)
- [ ] **Have a Render account** with a paid subscription
- [ ] **Node.js 16+** installed on your machine

## Step 1: Create PostgreSQL Database on Render

- [ ] Login to [Render Dashboard](https://dashboard.render.com)
- [ ] Click "New +" → "PostgreSQL"
- [ ] Configure database:
  - [ ] Name: `kravy-tracker-db`
  - [ ] Database: `kravy_tracker`
  - [ ] Region: (choose closest to you)
  - [ ] PostgreSQL Version: 16
  - [ ] Disk Size: **10 GB** ✓
- [ ] Click "Create Database"
- [ ] Wait for status to show "Available" (2-3 minutes)
- [ ] Copy the **Internal Database URL** (from the dashboard)
  - Format: `postgresql://username:password@hostname:port/database`
  - Keep this secure!

## Step 2: Update Backend Code (Already Done! ✅)

The following files have been updated for PostgreSQL compatibility:

- [x] `backend/package.json` - Updated to use `pg` instead of `sqlite3`
- [x] `backend/src/config/database.js` - PostgreSQL connection pool
- [x] `backend/src/database/init.js` - PostgreSQL schema
- [x] `backend/src/database/models.js` - Boolean and query compatibility
- [x] `backend/src/server.js` - Simplified initialization
- [x] Created `backend/.env.example` - Environment variable template
- [x] Created migration script: `migrate-sqlite-to-postgres.js`

## Step 3: Install Dependencies

- [ ] Open terminal and navigate to backend:
  ```bash
  cd backend
  ```

- [ ] Install dependencies:
  ```bash
  npm install
  ```
  This installs the `pg` PostgreSQL client library.

## Step 4: Configure Environment

- [ ] Create `.env` file:
  ```bash
  cp .env.example .env
  ```

- [ ] Edit `backend/.env` and add your credentials:
  ```env
  DATABASE_URL=postgresql://your_url_from_render
  NODE_ENV=production
  PORT=5000
  FRONTEND_URL=http://localhost:3000
  ```

- [ ] Save the file

## Step 5: Initialize Database

- [ ] Run the initialization script:
  ```bash
  npm run init-db
  ```

- [ ] Verify you see:
  ```
  Initializing database...
  Database connected
  Database initialized successfully!
  Done!
  ```

- [ ] Check Render dashboard → your database → "Data" tab to confirm tables exist

## Step 6: Migrate Data (Optional)

### Option A: Start Fresh (Recommended)
- [ ] Skip migration, let the app sync fresh data from RuneScape

### Option B: Migrate from SQLite
- [ ] Ensure SQLite database is in `backend/database/clan.db`
- [ ] Temporarily install sqlite3:
  ```bash
  npm install sqlite3 --save-dev
  ```
- [ ] Run migration:
  ```bash
  npm run migrate-from-sqlite
  ```
- [ ] Verify migration success messages
- [ ] Check data in Render dashboard

## Step 7: Test Backend Locally

- [ ] Start the backend:
  ```bash
  npm start
  ```

- [ ] Verify logs show:
  ```
  Database connected
  Database initialization complete
  Server running on port 5000
  ```

- [ ] Test health endpoint:
  ```bash
  curl http://localhost:5000/api/health
  ```

- [ ] Test members endpoint:
  ```bash
  curl http://localhost:5000/api/members
  ```

## Step 8: Test Frontend Locally

- [ ] Open new terminal
- [ ] Navigate to frontend:
  ```bash
  cd frontend
  ```

- [ ] Install dependencies (if not done):
  ```bash
  npm install
  ```

- [ ] Start frontend:
  ```bash
  npm start
  ```

- [ ] Open browser to `http://localhost:3000`
- [ ] Verify the app loads without errors
- [ ] Check browser console for any errors

## Step 9: Deploy Backend to Render

- [ ] Go to Render Dashboard
- [ ] Click "New +" → "Web Service"
- [ ] Connect GitHub repository
- [ ] Configure:
  - [ ] Name: `kravy-tracker-backend`
  - [ ] Environment: `Node`
  - [ ] Region: Same as database
  - [ ] Branch: `main`
  - [ ] Root Directory: `backend`
  - [ ] Build Command: `npm install`
  - [ ] Start Command: `npm start`

- [ ] Add Environment Variables:
  - [ ] `DATABASE_URL`: (copy from PostgreSQL dashboard)
  - [ ] `NODE_ENV`: `production`
  - [ ] `PORT`: `5000` (optional, Render sets this)
  - [ ] `FRONTEND_URL`: (your frontend URL or `*` for now)

- [ ] Click "Create Web Service"
- [ ] Wait for deployment (5-10 minutes)
- [ ] Check logs for "Database connected" and "Server running"
- [ ] Copy your backend URL (e.g., `https://kravy-tracker-backend.onrender.com`)

## Step 10: Deploy Frontend to Render

- [ ] Go to Render Dashboard
- [ ] Click "New +" → "Static Site"
- [ ] Connect GitHub repository
- [ ] Configure:
  - [ ] Name: `kravy-tracker-frontend`
  - [ ] Root Directory: `frontend`
  - [ ] Build Command: `npm install && npm run build`
  - [ ] Publish Directory: `build`

- [ ] Add Environment Variable:
  - [ ] `REACT_APP_API_URL`: (your backend URL from step 9)

- [ ] Click "Create Static Site"
- [ ] Wait for deployment (5-10 minutes)
- [ ] Visit your site URL
- [ ] Test all features

## Step 11: Update Backend CORS

- [ ] Go to backend web service on Render
- [ ] Update `FRONTEND_URL` environment variable with actual frontend URL
- [ ] Redeploy if needed

## Step 12: Verify Everything Works

- [ ] Can view clan members list
- [ ] Can view member profiles
- [ ] Can view leaderboards
- [ ] Can view activity feed
- [ ] Can trigger manual sync
- [ ] Automatic sync is working
- [ ] No console errors
- [ ] Database persists data between restarts

## Post-Migration Cleanup

- [ ] Remove old SQLite database (keep backup elsewhere)
- [ ] Remove `sqlite3` from dev dependencies (if installed):
  ```bash
  npm uninstall sqlite3 --save-dev
  ```
- [ ] Commit all changes to git:
  ```bash
  git add .
  git commit -m "Migrate from SQLite to PostgreSQL"
  git push
  ```
- [ ] Update documentation for your team
- [ ] Monitor logs for the first few days

## Troubleshooting Reference

### Problem: "Connection refused"
- Check DATABASE_URL is correct
- Verify database is "Available" in Render
- Check firewall/network settings

### Problem: "Tables don't exist"
- Run `npm run init-db` again
- Check Render database logs
- Verify init.js ran successfully

### Problem: "Boolean conversion errors"
- These should be fixed in the updated models.js
- If you see any, let me know which query

### Problem: "Deployment fails"
- Check Render build logs
- Verify package.json has correct dependencies
- Ensure all environment variables are set

### Problem: "Data is lost after restart"
- This shouldn't happen with PostgreSQL
- Verify you're using DATABASE_URL, not local SQLite
- Check Render database connection

## Success Indicators ✨

- ✅ Backend deploys without errors
- ✅ Frontend loads and displays data
- ✅ Data persists between server restarts
- ✅ Automatic sync is working
- ✅ No console errors
- ✅ Render dashboard shows healthy services
- ✅ Database usage is being tracked in Render

## Next Steps After Success

- Monitor database size over time
- Set up monitoring/alerts in Render
- Consider automated backups
- Document any custom configurations
- Train team on new deployment process

---

**Need Help?** Check [RENDER_SETUP_GUIDE.md](./RENDER_SETUP_GUIDE.md) for detailed explanations.

**Estimated Time:** 30-60 minutes (not including deployment wait times)

**Recommended Approach:** 
1. Do steps 1-8 first to test locally
2. Once local testing works, deploy (steps 9-11)
3. This minimizes debugging in production

