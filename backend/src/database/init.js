const db = require('../config/database');

async function initializeDatabase() {
  console.log('Initializing database...');

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT,
      total_xp INTEGER DEFAULT 0,
      total_rank INTEGER,
      clan_xp INTEGER DEFAULT 0,
      kills INTEGER DEFAULT 0,
      combat_level INTEGER DEFAULT 0,
      clan_rank TEXT DEFAULT 'Recruit',
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      last_synced DATETIME,
      last_sync_attempt DATETIME,
      last_xp_gain DATETIME,
      last_activity_date DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    );

    CREATE INDEX IF NOT EXISTS idx_members_name ON members(name);
    CREATE INDEX IF NOT EXISTS idx_members_active ON members(is_active);
    CREATE INDEX IF NOT EXISTS idx_members_rank ON members(clan_rank);

    CREATE TABLE IF NOT EXISTS xp_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      total_xp INTEGER NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_snapshots_member ON xp_snapshots(member_id);
    CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON xp_snapshots(timestamp);

    CREATE TABLE IF NOT EXISTS skills (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      skill_id INTEGER NOT NULL,
      skill_name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      rank INTEGER,
      daily_xp_gain INTEGER DEFAULT 0,
      weekly_xp_gain INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      UNIQUE(member_id, skill_id)
    );

    CREATE INDEX IF NOT EXISTS idx_skills_member ON skills(member_id);
    CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(skill_name);

    CREATE TABLE IF NOT EXISTS sync_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER,
      success INTEGER DEFAULT 1,
      error_message TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_sync_log_timestamp ON sync_log(timestamp);

    CREATE TABLE IF NOT EXISTS activities (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      activity_date INTEGER NOT NULL,
      text TEXT NOT NULL,
      details TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_activities_member ON activities(member_id);
    CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(activity_date DESC);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_unique ON activities(member_id, activity_date, text);

    CREATE TABLE IF NOT EXISTS periodic_xp_gains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      total_daily_xp_gain INTEGER DEFAULT 0,
      total_weekly_xp_gain INTEGER DEFAULT 0,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_periodic_xp_timestamp ON periodic_xp_gains(timestamp);

    CREATE TABLE IF NOT EXISTS clan_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_name TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN ('join', 'leave')),
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  console.log('Database initialized successfully!');
}

if (require.main === module) {
  initializeDatabase()
    .then(() => {
      console.log('Done!');
      process.exit(0);
    })
    .catch(err => {
      console.error('Failed to initialize database:', err);
      process.exit(1);
    });
}

module.exports = { initializeDatabase };

