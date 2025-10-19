# Render PostgreSQL Setup Guide

This guide will help you migrate your Kravy Tracker from SQLite to PostgreSQL on Render.

## Why PostgreSQL on Render?

- **Persistent Storage**: Unlike SQLite, PostgreSQL on Render provides true persistent storage
- **Production Ready**: Built for concurrent connections and high availability
- **Automatic Backups**: Render provides daily backups
- **Scalability**: Easy to scale as your clan grows
- **10 GB Storage**: Plenty of room for years of clan data

## Step 1: Create PostgreSQL Database on Render

1. **Login to Render Dashboard**
   - Go to [dashboard.render.com](https://dashboard.render.com)

2. **Create New PostgreSQL Database**
   - Click "New +" button → Select "PostgreSQL"
   - Fill in the details:
     - **Name**: `kravy-tracker-db` (or your choice)
     - **Database**: `kravy_tracker`
     - **User**: (auto-generated)
     - **Region**: Choose closest to your users
     - **PostgreSQL Version**: 16 (latest)
     - **Datadog API Key**: Leave blank
     - **Plan**: Select your paid plan (10 GB as shown in your screenshot)

3. **Wait for Database Creation**
   - Takes about 2-3 minutes
   - Status will change from "Creating" to "Available"

4. **Copy Connection Details**
   - Once created, you'll see connection info
   - Copy the **Internal Database URL** (starts with `postgresql://`)
   - It looks like: `postgresql://username:password@hostname:port/database`
   - Keep this secure - it contains your password!

## Step 2: Set Up Backend Environment Variables

1. **Navigate to your backend folder**:
   ```bash
   cd backend
   ```

2. **Create a `.env` file** (based on `.env.example`):
   ```bash
   cp .env.example .env
   ```

3. **Edit `.env` and add your database URL**:
   ```env
   DATABASE_URL=postgresql://username:password@hostname:port/database
   NODE_ENV=production
   PORT=5000
   FRONTEND_URL=http://localhost:3000
   ```

## Step 3: Install Dependencies

The code has been updated to use PostgreSQL. Install the new dependencies:

```bash
cd backend
npm install
```

This will install:
- `pg` (node-postgres) - PostgreSQL client for Node.js
- Remove `sqlite3` (no longer needed)

## Step 4: Initialize Database Schema

Run the initialization script to create all tables:

```bash
cd backend
npm run init-db
```

You should see:
```
Initializing database...
Database connected
Database initialized successfully!
Done!
```

## Step 5: Migrate Your Data (Optional)

If you have existing SQLite data you want to keep:

### Option A: Start Fresh (Recommended if testing)
Just run your backend and let it sync fresh data from RuneScape.

### Option B: Migrate Existing Data

You'll need to export data from SQLite and import to PostgreSQL. Here's a simple approach:

1. **Keep your old SQLite database** (`backend/database/clan.db`)
2. **Run both databases temporarily** to compare
3. **Use the sync features** to populate the new database

The app will sync all member data from RuneScape API automatically.

## Step 6: Test Your Backend

1. **Start the backend**:
   ```bash
   cd backend
   npm start
   ```

2. **Check the logs**:
   - Should see: `Database connected`
   - Should see: `Server running on port 5000`

3. **Test API endpoints**:
   ```bash
   curl http://localhost:5000/api/members
   ```

## Step 7: Deploy to Render (Backend)

1. **Create Web Service on Render**:
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Settings:
     - **Name**: `kravy-tracker-backend`
     - **Environment**: `Node`
     - **Region**: Same as database
     - **Branch**: `main`
     - **Root Directory**: `backend`
     - **Build Command**: `npm install`
     - **Start Command**: `npm start`

2. **Add Environment Variables**:
   - In Render dashboard, go to your web service
   - Click "Environment" tab
   - Add:
     - `DATABASE_URL`: (paste from your PostgreSQL dashboard)
     - `NODE_ENV`: `production`
     - `FRONTEND_URL`: (your frontend URL once deployed)

3. **Deploy**:
   - Click "Create Web Service"
   - Render will automatically deploy

## Step 8: Deploy Frontend (Optional)

1. **Create Static Site on Render**:
   - Click "New +" → "Static Site"
   - Connect your GitHub repository
   - Settings:
     - **Name**: `kravy-tracker-frontend`
     - **Root Directory**: `frontend`
     - **Build Command**: `npm install && npm run build`
     - **Publish Directory**: `build`

2. **Add Environment Variable**:
   - `REACT_APP_API_URL`: Your backend URL from step 7

## Troubleshooting

### "Connection refused" error
- Check that `DATABASE_URL` is set correctly
- Make sure you're using the **Internal Database URL** from Render

### "SSL connection error"
- This is handled automatically in production
- For local development, set `NODE_ENV=development`

### "Tables don't exist"
- Run `npm run init-db` again
- Check database logs in Render dashboard

### "lastID is null" after inserts
- This is normal for some operations
- The code handles this automatically

### Migration issues
- Start fresh with a clean database
- Let the sync process populate data from RuneScape API

## Storage Size Recommendations

Based on your clan tracker:
- **1 GB**: Minimal (1-2 years for small clan)
- **5 GB**: Good (3-5 years for medium clan)
- **10 GB**: Excellent (many years, recommended) ✓
- **20+ GB**: Overkill for most clans

Your selection of **10 GB** is perfect! It gives you:
- Plenty of room for historical data
- Space for activity logs
- Room for future features
- Years of XP snapshots

## Key Changes Made

### Code Changes
1. ✅ Updated `package.json` - Replaced `sqlite3` with `pg`
2. ✅ Updated `database.js` - New PostgreSQL connection pool
3. ✅ Updated `init.js` - PostgreSQL schema (SERIAL, BOOLEAN, TIMESTAMP)
4. ✅ Updated `models.js` - Boolean queries (TRUE/FALSE instead of 1/0)
5. ✅ Created `.env.example` - Environment variable template

### Database Schema Changes
- `INTEGER` → `INT` or `BIGINT`
- `AUTOINCREMENT` → `SERIAL`
- `DATETIME` → `TIMESTAMP`
- `INTEGER DEFAULT 1` (for booleans) → `BOOLEAN DEFAULT TRUE`
- SQLite `?` placeholders → PostgreSQL `$1, $2...` (automatic conversion)

### No Changes Needed
- ✅ Your SQL queries mostly work as-is
- ✅ All model methods compatible
- ✅ Frontend code unchanged
- ✅ API endpoints unchanged

## Yes, You Can Continue Using SQL! 

PostgreSQL is SQL! It's actually more feature-rich than SQLite:
- Full ACID compliance
- Better performance for multiple connections
- Advanced indexing
- Full-text search
- JSON support
- And much more!

Your queries will work the same (or better) with PostgreSQL.

## Next Steps

1. ✅ Create PostgreSQL database on Render (10 GB)
2. ✅ Copy the Internal Database URL
3. Run `npm install` in backend folder
4. Create `.env` file with `DATABASE_URL`
5. Run `npm run init-db`
6. Test locally with `npm start`
7. Deploy to Render
8. Sync your clan data!

## Questions?

If you run into any issues, check:
1. Render dashboard logs
2. Backend console output
3. Environment variables are set correctly
4. Database URL has no typos

Good luck! Your clan tracker will now have a robust, production-ready database! 🎉

