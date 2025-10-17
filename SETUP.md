# Kravy Tracker - Setup Guide

This guide will help you get the Kravy Tracker up and running.

## Prerequisites

- Node.js (v16 or higher)
- npm (v7 or higher)

## Installation Steps

### 1. Backend Setup

```bash
cd backend
npm install
```

### 2. Initialize Database

```bash
npm run init-db
```

This will create the SQLite database with all necessary tables.

### 3. Start Backend Server

```bash
npm run dev
```

The backend will start on `http://localhost:3001`

### 4. Frontend Setup (in a new terminal)

```bash
cd frontend
npm install
```

### 5. Start Frontend

```bash
npm start
```

The frontend will start on `http://localhost:3000` and open in your browser.

## Usage

### Adding Members

1. Navigate to the "Members" page
2. You can add members in two ways:
   - **Single Add**: Enter one username and click "Add"
   - **Bulk Add**: Click "Bulk Add", paste multiple usernames (one per line), and submit

### Syncing Data

- **Sync All**: Click "Sync All" on the Members page to fetch latest data for all members
- **Auto Sync**: The backend automatically syncs all members every 6 hours (configurable in `.env`)

### Viewing Stats

- **Dashboard**: Overview of clan stats and top gainers
- **Leaderboard**: View top XP gainers by daily, weekly, or monthly periods
- **Members**: View all clan members and their current stats

## API Endpoints

### Members
- `GET /api/members` - Get all clan members
- `POST /api/members` - Add a new member
- `POST /api/members/bulk` - Add multiple members
- `GET /api/members/:id/stats` - Get member statistics
- `POST /api/members/:id/sync` - Sync specific member
- `DELETE /api/members/:id` - Delete a member

### Sync
- `POST /api/sync/all` - Sync all members
- `GET /api/sync/logs` - View sync logs

### Leaderboard
- `GET /api/leaderboard/:period` - Get leaderboard (daily/weekly/monthly)
- `GET /api/leaderboard/top/gainers` - Get top gainers across all periods
- `GET /api/leaderboard/clan/stats` - Get overall clan statistics

## Configuration

### Backend (.env)
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment (development/production)
- `DATABASE_PATH`: Path to SQLite database
- `SYNC_SCHEDULE`: Cron schedule for auto-sync (default: every 6 hours)

### Frontend (.env)
- `REACT_APP_API_URL`: Backend API URL (default: http://localhost:3001/api)

## Troubleshooting

### Database Issues
If you encounter database errors, try reinitializing:
```bash
cd backend
rm -f ../database/clan.db
npm run init-db
```

### API Rate Limiting
RuneMetrics API has rate limits. The system adds 1-second delays between requests to avoid hitting limits.

### Member Not Found
Ensure the RuneScape username is spelled correctly and the player has RuneMetrics enabled.

## Production Deployment

### Backend
1. Set `NODE_ENV=production` in `.env`
2. Use a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start src/server.js --name kravy-backend
   ```

### Frontend
1. Build the production bundle:
   ```bash
   npm run build
   ```
2. Serve the `build` folder using a static server or deploy to Vercel/Netlify

### Database Backups
Regularly backup your SQLite database:
```bash
cp database/clan.db database/clan.db.backup
```

## Tips

1. **Initial Setup**: Add all 490 members using bulk add, then run a sync
2. **Regular Syncing**: Let the auto-sync run, or manually sync when needed
3. **Performance**: The system handles hundreds of members efficiently
4. **Data History**: XP snapshots are stored on every sync, building historical data over time

## Support

For issues or questions, check the README.md or review the code documentation.


