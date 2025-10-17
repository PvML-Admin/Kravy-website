# API Reference

Complete API documentation for Kravy Tracker backend.

## Base URL

```
http://localhost:3001/api
```

## Response Format

All endpoints return JSON in this format:

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

Error responses:
```json
{
  "success": false,
  "error": "Error message here"
}
```

---

## Members Endpoints

### Get All Members

```
GET /api/members
```

Query Parameters:
- `active` (optional): `true` or `false`, defaults to `true`

Example:
```bash
curl http://localhost:3001/api/members
curl http://localhost:3001/api/members?active=false
```

Response:
```json
{
  "success": true,
  "count": 490,
  "members": [
    {
      "id": 1,
      "name": "playername",
      "display_name": "PlayerName",
      "total_xp": 1234567890,
      "combat_level": 138,
      "last_synced": "2025-10-16T12:00:00.000Z",
      "created_at": "2025-10-16T10:00:00.000Z",
      "is_active": 1
    }
  ]
}
```

### Get Single Member

```
GET /api/members/:identifier
```

`:identifier` can be either:
- Member ID (number)
- Member name (string)

Example:
```bash
curl http://localhost:3001/api/members/1
curl http://localhost:3001/api/members/PlayerName
```

### Get Member Stats

```
GET /api/members/:identifier/stats
```

Query Parameters:
- `period` (optional): `daily`, `weekly`, or `monthly`, defaults to `weekly`

Example:
```bash
curl "http://localhost:3001/api/members/1/stats?period=weekly"
```

Response:
```json
{
  "success": true,
  "stats": {
    "member": { ... },
    "skills": [
      {
        "skill_name": "Attack",
        "level": 99,
        "xp": 13034431,
        "rank": 123456
      }
    ],
    "xpGains": {
      "daily": 1234567,
      "weekly": 8901234,
      "monthly": 35678901
    },
    "snapshotCount": 42,
    "lastSnapshot": { ... }
  }
}
```

### Add Single Member

```
POST /api/members
```

Body:
```json
{
  "name": "PlayerName",
  "fetchData": true
}
```

- `name`: RuneScape username (required)
- `fetchData`: If `true`, fetches and validates data from RuneMetrics immediately

Example:
```bash
curl -X POST http://localhost:3001/api/members \
  -H "Content-Type: application/json" \
  -d '{"name":"PlayerName","fetchData":true}'
```

### Bulk Add Members

```
POST /api/members/bulk
```

Body:
```json
{
  "names": ["Player1", "Player2", "Player3"]
}
```

Example:
```bash
curl -X POST http://localhost:3001/api/members/bulk \
  -H "Content-Type: application/json" \
  -d '{"names":["Player1","Player2","Player3"]}'
```

Response:
```json
{
  "success": true,
  "results": {
    "added": ["Player1", "Player3"],
    "skipped": ["Player2"],
    "errors": []
  }
}
```

### Sync Member

```
POST /api/members/:id/sync
```

Fetches latest data from RuneMetrics for a specific member.

Example:
```bash
curl -X POST http://localhost:3001/api/members/1/sync
```

### Delete Member

```
DELETE /api/members/:id
```

Example:
```bash
curl -X DELETE http://localhost:3001/api/members/1
```

### Update Member Active Status

```
PATCH /api/members/:id/active
```

Body:
```json
{
  "active": false
}
```

Example:
```bash
curl -X PATCH http://localhost:3001/api/members/1/active \
  -H "Content-Type: application/json" \
  -d '{"active":false}'
```

---

## Sync Endpoints

### Sync All Members

```
POST /api/sync/all
```

Triggers a full sync of all active members. This may take several minutes.

Example:
```bash
curl -X POST http://localhost:3001/api/sync/all
```

Response:
```json
{
  "success": true,
  "results": {
    "total": 490,
    "successful": 485,
    "failed": 5,
    "errors": [
      {
        "member": "PlayerName",
        "error": "Player not found"
      }
    ]
  }
}
```

### Sync Single Member

```
POST /api/sync/member/:id
```

Example:
```bash
curl -X POST http://localhost:3001/api/sync/member/1
```

### Get Sync Logs

```
GET /api/sync/logs
```

Query Parameters:
- `limit` (optional): Number of logs to return, defaults to 100

Example:
```bash
curl "http://localhost:3001/api/sync/logs?limit=50"
```

Response:
```json
{
  "success": true,
  "logs": [
    {
      "id": 123,
      "member_id": 1,
      "member_name": "PlayerName",
      "success": 1,
      "error_message": null,
      "timestamp": "2025-10-16T12:00:00.000Z"
    }
  ]
}
```

---

## Leaderboard Endpoints

### Get Leaderboard by Period

```
GET /api/leaderboard/:period
```

`:period` must be one of:
- `daily`
- `weekly`
- `monthly`

Query Parameters:
- `limit` (optional): Number of results, defaults to 50

Example:
```bash
curl "http://localhost:3001/api/leaderboard/weekly?limit=10"
```

Response:
```json
{
  "success": true,
  "period": "weekly",
  "count": 10,
  "leaderboard": [
    {
      "id": 1,
      "name": "PlayerName",
      "totalXp": 1234567890,
      "xpGain": 8901234,
      "combatLevel": 138,
      "lastSynced": "2025-10-16T12:00:00.000Z"
    }
  ]
}
```

### Get Top Gainers

```
GET /api/leaderboard/top/gainers
```

Returns top gainers for all periods (daily, weekly, monthly).

Query Parameters:
- `count` (optional): Number of top gainers per period, defaults to 10

Example:
```bash
curl "http://localhost:3001/api/leaderboard/top/gainers?count=5"
```

Response:
```json
{
  "success": true,
  "topGainers": {
    "daily": [ ... ],
    "weekly": [ ... ],
    "monthly": [ ... ]
  }
}
```

### Get Clan Statistics

```
GET /api/leaderboard/clan/stats
```

Example:
```bash
curl http://localhost:3001/api/leaderboard/clan/stats
```

Response:
```json
{
  "success": true,
  "stats": {
    "totalMembers": 490,
    "activeMembers": 485,
    "totalXp": 123456789012,
    "averageCombatLevel": 125,
    "averageXp": 254605080
  }
}
```

---

## Health Check

### Check API Health

```
GET /api/health
```

Example:
```bash
curl http://localhost:3001/api/health
```

Response:
```json
{
  "success": true,
  "status": "healthy",
  "timestamp": "2025-10-16T12:00:00.000Z"
}
```

---

## Error Codes

- `200`: Success
- `201`: Created
- `400`: Bad Request (invalid input)
- `404`: Not Found
- `409`: Conflict (e.g., member already exists)
- `500`: Internal Server Error

---

## Rate Limiting

The RuneMetrics API has rate limits. The backend automatically adds 1-second delays between requests to avoid hitting these limits.

When syncing many members, expect approximately:
- 100 members: ~2 minutes
- 490 members: ~8-10 minutes

---

## Notes

- All timestamps are in ISO 8601 format
- XP values are integers (not divided by 10)
- Member names are stored in lowercase internally
- Display names preserve the original casing


