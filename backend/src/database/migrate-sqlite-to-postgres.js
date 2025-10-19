/**
 * SQLite to PostgreSQL Data Migration Script
 * 
 * This script helps migrate your existing SQLite data to PostgreSQL.
 * Only run this if you have existing data you want to preserve.
 * 
 * Usage: node src/database/migrate-sqlite-to-postgres.js
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');
require('dotenv').config();

// NOTE: You'll need to temporarily install sqlite3 to run this migration
// npm install sqlite3 --save-dev

const { Pool } = require('pg');

// Source: SQLite database
const sqlitePath = path.join(__dirname, '../../database/clan.db');
const sqliteDb = new sqlite3.Database(sqlitePath);

// Destination: PostgreSQL database
const pgPool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? {
    rejectUnauthorized: false
  } : false,
});

// Helper to promisify SQLite
function sqliteAll(sql) {
  return new Promise((resolve, reject) => {
    sqliteDb.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function migrateData() {
  console.log('🚀 Starting migration from SQLite to PostgreSQL...\n');

  try {
    // 1. Migrate Members
    console.log('📋 Migrating members...');
    const members = await sqliteAll('SELECT * FROM members');
    for (const member of members) {
      await pgPool.query(
        `INSERT INTO members (
          id, name, display_name, total_xp, total_rank, clan_xp, kills, 
          combat_level, clan_rank, joined_at, last_synced, last_sync_attempt,
          last_xp_gain, last_activity_date, created_at, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (name) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          total_xp = EXCLUDED.total_xp,
          total_rank = EXCLUDED.total_rank,
          clan_xp = EXCLUDED.clan_xp,
          kills = EXCLUDED.kills,
          combat_level = EXCLUDED.combat_level,
          clan_rank = EXCLUDED.clan_rank,
          last_synced = EXCLUDED.last_synced,
          last_sync_attempt = EXCLUDED.last_sync_attempt,
          is_active = EXCLUDED.is_active`,
        [
          member.id, member.name, member.display_name, member.total_xp,
          member.total_rank, member.clan_xp, member.kills, member.combat_level,
          member.clan_rank, member.joined_at, member.last_synced, 
          member.last_sync_attempt, member.last_xp_gain, member.last_activity_date,
          member.created_at, member.is_active === 1
        ]
      );
    }
    console.log(`✅ Migrated ${members.length} members\n`);

    // 2. Migrate Skills
    console.log('🎯 Migrating skills...');
    const skills = await sqliteAll('SELECT * FROM skills');
    for (const skill of skills) {
      await pgPool.query(
        `INSERT INTO skills (
          id, member_id, skill_id, skill_name, level, xp, rank, 
          daily_xp_gain, weekly_xp_gain, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (member_id, skill_id) DO UPDATE SET
          level = EXCLUDED.level,
          xp = EXCLUDED.xp,
          rank = EXCLUDED.rank,
          daily_xp_gain = EXCLUDED.daily_xp_gain,
          weekly_xp_gain = EXCLUDED.weekly_xp_gain,
          updated_at = EXCLUDED.updated_at`,
        [
          skill.id, skill.member_id, skill.skill_id, skill.skill_name,
          skill.level, skill.xp, skill.rank, skill.daily_xp_gain,
          skill.weekly_xp_gain, skill.updated_at
        ]
      );
    }
    console.log(`✅ Migrated ${skills.length} skills\n`);

    // 3. Migrate XP Snapshots
    console.log('📊 Migrating XP snapshots...');
    const snapshots = await sqliteAll('SELECT * FROM xp_snapshots');
    for (const snapshot of snapshots) {
      await pgPool.query(
        `INSERT INTO xp_snapshots (id, member_id, total_xp, timestamp)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [snapshot.id, snapshot.member_id, snapshot.total_xp, snapshot.timestamp]
      );
    }
    console.log(`✅ Migrated ${snapshots.length} XP snapshots\n`);

    // 4. Migrate Activities
    console.log('🎮 Migrating activities...');
    const activities = await sqliteAll('SELECT * FROM activities');
    for (const activity of activities) {
      await pgPool.query(
        `INSERT INTO activities (id, member_id, activity_date, text, details, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT DO NOTHING`,
        [
          activity.id, activity.member_id, activity.activity_date,
          activity.text, activity.details, activity.created_at
        ]
      );
    }
    console.log(`✅ Migrated ${activities.length} activities\n`);

    // 5. Migrate Clan Events
    console.log('🎪 Migrating clan events...');
    const events = await sqliteAll('SELECT * FROM clan_events');
    for (const event of events) {
      await pgPool.query(
        `INSERT INTO clan_events (id, member_name, event_type, timestamp)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO NOTHING`,
        [event.id, event.member_name, event.event_type, event.timestamp]
      );
    }
    console.log(`✅ Migrated ${events.length} clan events\n`);

    // 6. Update sequences to match the max IDs
    console.log('🔢 Updating PostgreSQL sequences...');
    const tables = ['members', 'skills', 'xp_snapshots', 'activities', 'clan_events'];
    for (const table of tables) {
      await pgPool.query(`
        SELECT setval(pg_get_serial_sequence('${table}', 'id'), 
                     (SELECT MAX(id) FROM ${table}))
      `);
    }
    console.log('✅ Sequences updated\n');

    console.log('🎉 Migration completed successfully!');
    console.log('\n📝 Next steps:');
    console.log('1. Verify data in PostgreSQL');
    console.log('2. Test your application');
    console.log('3. Keep SQLite backup until confident');
    console.log('4. Update your .env to use DATABASE_URL permanently');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    sqliteDb.close();
    await pgPool.end();
  }
}

// Run if called directly
if (require.main === module) {
  migrateData()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { migrateData };

