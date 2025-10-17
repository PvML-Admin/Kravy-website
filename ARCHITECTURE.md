# Kravy Tracker - Architecture Documentation

## System Architecture

This document describes the architecture and design decisions for the Kravy Tracker application.

## Overview

Kravy Tracker is a full-stack web application that tracks RuneScape clan member XP gains over time. It follows a clean, modular architecture with clear separation of concerns.

```
┌─────────────────┐
│  React Frontend │ ──HTTP──▶ ┌──────────────────┐
│   (Port 3000)   │           │  Express Backend │
└─────────────────┘           │   (Port 3001)    │
                              └──────────────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │ SQLite Database  │
                              │   (clan.db)      │
                              └──────────────────┘
                                       │
                                       ▼
                              ┌──────────────────┐
                              │ RuneMetrics API  │
                              │  (External)      │
                              └──────────────────┘
```

## Backend Architecture

### Layer Structure

```
backend/
├── src/
│   ├── api/           # HTTP route handlers
│   ├── services/      # Business logic
│   ├── database/      # Database layer
│   ├── config/        # Configuration
│   ├── utils/         # Utilities
│   └── server.js      # Application entry point
```

### Design Patterns

1. **Layered Architecture**
   - API Layer: Handles HTTP requests/responses
   - Service Layer: Business logic and orchestration
   - Data Layer: Database operations

2. **Repository Pattern**
   - Models encapsulate database operations
   - Services use models to access data
   - Clean separation between business logic and data access

3. **Dependency Injection**
   - Database connection injected into models
   - Services injected into routes

### Key Components

#### API Routes (`/api/*`)
- `members.js`: Member CRUD operations
- `sync.js`: Data synchronization endpoints
- `leaderboard.js`: Leaderboard and statistics

#### Services
- `runemetrics.js`: RuneMetrics API integration
  - Fetches player profiles
  - Parses API responses
  - Handles rate limiting
  
- `syncService.js`: Data synchronization logic
  - Syncs individual/all members
  - Calculates XP gains
  - Generates statistics
  
- `leaderboardService.js`: Leaderboard generation
  - Computes rankings
  - Aggregates clan statistics

#### Database Models
- `MemberModel`: Member CRUD operations
- `SnapshotModel`: XP snapshot management
- `SkillModel`: Skill data operations
- `SyncLogModel`: Sync history tracking

### Database Schema

```sql
members
├── id (PK)
├── name (UNIQUE)
├── display_name
├── total_xp
├── combat_level
├── last_synced
├── created_at
└── is_active

xp_snapshots
├── id (PK)
├── member_id (FK)
├── total_xp
└── timestamp

skills
├── id (PK)
├── member_id (FK)
├── skill_id
├── skill_name
├── level
├── xp
├── rank
└── updated_at

sync_log
├── id (PK)
├── member_id (FK)
├── success
├── error_message
└── timestamp
```

### Scheduled Tasks

- Uses `node-cron` for scheduling
- Default: Syncs all members every 6 hours
- Configurable via `SYNC_SCHEDULE` environment variable
- Only runs in production mode

## Frontend Architecture

### Component Structure

```
frontend/src/
├── components/
│   ├── Dashboard.js      # Main dashboard
│   ├── MemberList.js     # Member management
│   ├── Leaderboard.js    # Rankings
│   └── XpGainChart.js    # Data visualization
├── services/
│   └── api.js           # API client
├── App.js               # Root component
└── index.js             # Entry point
```

### Design Patterns

1. **Component-Based Architecture**
   - Reusable, self-contained components
   - Clear component hierarchy

2. **Service Layer**
   - Centralized API communication
   - Consistent error handling

3. **Hooks-Based State Management**
   - useState for local state
   - useEffect for side effects
   - No complex state management needed (keeps it simple)

### Key Components

#### Dashboard
- Displays clan overview statistics
- Shows top daily/weekly gainers
- Visualizes XP gains with charts

#### MemberList
- Member CRUD operations
- Bulk member import
- Manual sync triggers

#### Leaderboard
- Tabbed interface (daily/weekly/monthly)
- Sortable rankings
- Formatted XP display

#### XpGainChart
- Chart.js integration
- Bar chart visualization
- Responsive design

## Data Flow

### Adding a Member

```
User Input
    │
    ▼
Frontend (MemberList.js)
    │
    ▼
API Call (POST /api/members)
    │
    ▼
Route Handler (members.js)
    │
    ▼
RuneMetrics Service (getPlayerStats)
    │
    ▼
External API (RuneMetrics)
    │
    ▼
MemberModel (create)
    │
    ▼
SQLite Database
    │
    ▼
Response to Frontend
```

### Syncing Members

```
Cron Scheduler / Manual Trigger
    │
    ▼
syncService.syncAllMembers()
    │
    ▼
For Each Member:
    │
    ├──▶ Fetch from RuneMetrics
    │
    ├──▶ Update Member Record
    │
    ├──▶ Create XP Snapshot
    │
    ├──▶ Update Skills
    │
    └──▶ Log Result
```

### Calculating XP Gains

```
Request Leaderboard
    │
    ▼
Get All Members
    │
    ▼
For Each Member:
    │
    ├──▶ Get XP Snapshots
    │
    ├──▶ Filter by Time Period
    │
    ├──▶ Calculate Difference
    │
    └──▶ Add to Results
    │
    ▼
Sort by XP Gain
    │
    ▼
Return Top N
```

## API Design

### RESTful Principles
- Resource-based URLs
- HTTP methods (GET, POST, PATCH, DELETE)
- Consistent response format
- Proper status codes

### Response Format

```json
{
  "success": true,
  "data": { ... },
  "error": null
}
```

### Error Handling
- Centralized error middleware
- Consistent error responses
- Detailed error messages in development
- Safe error messages in production

## Performance Considerations

### Backend
- SQLite with WAL mode for concurrent reads
- Indexed columns for fast queries
- Rate limiting for external API calls
- Efficient batch operations

### Frontend
- Lazy loading of components
- Memoization where appropriate
- Optimized re-renders
- Responsive design without heavy frameworks

### Database
- Proper indexes on frequently queried columns
- Foreign key constraints
- Timestamps for historical queries

## Security

### Backend
- CORS configured for frontend
- Input validation on all endpoints
- SQL injection protection (parameterized queries)
- Error handling without exposing internals

### Database
- Foreign key constraints
- Transaction support
- Data integrity checks

## Scalability

### Current Scale
- Designed for ~500 members
- Handles bulk operations efficiently
- Reasonable sync intervals (6 hours)

### Future Improvements
- Redis cache for frequent queries
- Job queue for sync operations
- WebSocket for real-time updates
- PostgreSQL for larger datasets

## Code Quality

### Principles
- DRY (Don't Repeat Yourself)
- Single Responsibility Principle
- Clear function/module naming
- Minimal comments (self-documenting code)

### Structure
- Modular design
- Clear separation of concerns
- Consistent naming conventions
- No code debt

## Testing Strategy

### Backend
- Unit tests for services
- Integration tests for API routes
- Database tests with in-memory SQLite

### Frontend
- Component tests with React Testing Library
- API service tests
- End-to-end tests with Cypress

## Deployment

### Development
- Local development with hot reload
- Separate backend/frontend
- Development database

### Production
- Build optimized frontend
- Process manager for backend (PM2)
- Regular database backups
- Environment-based configuration
- Monitoring and logging

## Future Enhancements

1. **Authentication**
   - User accounts
   - Role-based access

2. **Advanced Analytics**
   - Skill-specific tracking
   - Activity feed
   - Achievements

3. **Social Features**
   - Comments
   - Activity sharing
   - Member profiles

4. **Performance**
   - Caching layer
   - Database optimization
   - CDN for frontend

5. **Monitoring**
   - Error tracking (Sentry)
   - Analytics (Google Analytics)
   - Performance monitoring

## Maintenance

### Regular Tasks
- Database backups
- Dependency updates
- Security patches
- Performance monitoring

### Monitoring
- Sync success rates
- API response times
- Error rates
- Database size


