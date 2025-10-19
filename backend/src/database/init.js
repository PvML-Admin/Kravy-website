const db = require('../config/database');

async function initializeDatabase() {
  console.log('Initializing database...');

  // PostgreSQL syntax - execute each statement separately
  const statements = [
    `CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      display_name TEXT,
      total_xp BIGINT DEFAULT 0,
      total_rank INT,
      clan_xp BIGINT DEFAULT 0,
      kills BIGINT DEFAULT 0,
      combat_level INT DEFAULT 0,
      clan_rank TEXT DEFAULT 'Recruit',
      joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      last_synced TIMESTAMP,
      last_sync_attempt TIMESTAMP,
      last_xp_gain TIMESTAMP,
      last_activity_date TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active BOOLEAN DEFAULT TRUE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_members_name ON members(name)`,
    `CREATE INDEX IF NOT EXISTS idx_members_active ON members(is_active)`,
    `CREATE INDEX IF NOT EXISTS idx_members_rank ON members(clan_rank)`,
    
    `CREATE TABLE IF NOT EXISTS xp_snapshots (
      id SERIAL PRIMARY KEY,
      member_id INT NOT NULL,
      total_xp BIGINT NOT NULL,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_snapshots_member ON xp_snapshots(member_id)`,
    `CREATE INDEX IF NOT EXISTS idx_snapshots_timestamp ON xp_snapshots(timestamp)`,
    
    `CREATE TABLE IF NOT EXISTS skills (
      id SERIAL PRIMARY KEY,
      member_id INT NOT NULL,
      skill_id INT NOT NULL,
      skill_name TEXT NOT NULL,
      level INT DEFAULT 1,
      xp BIGINT DEFAULT 0,
      rank INT,
      daily_xp_gain BIGINT DEFAULT 0,
      weekly_xp_gain BIGINT DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      UNIQUE(member_id, skill_id)
    )`,
    `CREATE INDEX IF NOT EXISTS idx_skills_member ON skills(member_id)`,
    `CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(skill_name)`,
    
    `CREATE TABLE IF NOT EXISTS sync_log (
      id SERIAL PRIMARY KEY,
      member_id INT,
      success BOOLEAN DEFAULT TRUE,
      error_message TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_sync_log_timestamp ON sync_log(timestamp)`,
    
    `CREATE TABLE IF NOT EXISTS activities (
      id SERIAL PRIMARY KEY,
      member_id INT NOT NULL,
      activity_date BIGINT NOT NULL,
      text TEXT NOT NULL,
      details TEXT,
      category TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
    )`,
    `CREATE INDEX IF NOT EXISTS idx_activities_member ON activities(member_id)`,
    `CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(activity_date DESC)`,
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_unique ON activities(member_id, activity_date, text)`,
    
    `CREATE TABLE IF NOT EXISTS periodic_xp_gains (
      id SERIAL PRIMARY KEY,
      total_daily_xp_gain BIGINT DEFAULT 0,
      total_weekly_xp_gain BIGINT DEFAULT 0,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE INDEX IF NOT EXISTS idx_periodic_xp_timestamp ON periodic_xp_gains(timestamp)`,
    
    `CREATE TABLE IF NOT EXISTS clan_events (
      id SERIAL PRIMARY KEY,
      member_name TEXT NOT NULL,
      event_type TEXT NOT NULL CHECK(event_type IN ('join', 'leave')),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`
  ];

  // Execute statements one by one
  for (const statement of statements) {
    await db.pool.query(statement);
  }

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

