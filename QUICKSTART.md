# Kravy Tracker - Quick Start

Get up and running in 5 minutes!

## Installation

```bash
cd backend
npm install
npm run init-db

cd ../frontend
npm install
```

## Running

### Terminal 1 - Backend
```bash
cd backend
npm run dev
```

### Terminal 2 - Frontend
```bash
cd frontend
npm start
```

## First Steps

1. Open http://localhost:3000
2. Go to "Members" page
3. Click "Bulk Add"
4. Paste your clan member names (one per line)
5. Click "Add All"
6. Click "Sync All" to fetch their data
7. Wait for sync to complete
8. View Dashboard and Leaderboard!

## Importing 490 Members

Create a text file with all member names (one per line):
```
PlayerName1
PlayerName2
PlayerName3
...
```

Copy all names, paste into "Bulk Add", and submit. Then sync!

## Tips

- Syncing 490 members takes ~8 minutes (1 second delay between API calls)
- Auto-sync runs every 6 hours in production
- Dashboard shows real-time stats and top gainers
- Leaderboard tracks daily, weekly, and monthly XP gains

## Troubleshooting

**Member not found error**: 
- Verify username spelling
- Player must have RuneMetrics enabled

**Database error**:
```bash
cd backend
npm run init-db
```

That's it! You're ready to track your clan's progress!


