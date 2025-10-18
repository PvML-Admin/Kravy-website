const db = require('../config/database');

async function migrate() {
  console.log('Checking if periodic XP gain columns need to be added...');
  
  // Check if columns already exist
  const tableInfo = await db.allAsync('PRAGMA table_info(skills)');
  const hasDailyXpGain = tableInfo.some(col => col.name === 'daily_xp_gain');
  const hasWeeklyXpGain = tableInfo.some(col => col.name === 'weekly_xp_gain');

  if (hasDailyXpGain && hasWeeklyXpGain) {
    console.log('Periodic XP gain columns already exist. Skipping migration.');
    return;
  }

  console.log('Adding periodic XP gain columns...');
  
  try {
    await db.execAsync(`
      ALTER TABLE skills ADD COLUMN daily_xp_gain INTEGER DEFAULT 0;
      ALTER TABLE skills ADD COLUMN weekly_xp_gain INTEGER DEFAULT 0;
    `);
  } catch (error) {
    // If ALTER fails (likely because columns exist), we're good
    if (error.message.includes('duplicate column name')) {
      console.log('Columns already exist (from ALTER attempt).');
      return;
    }
    throw error;
  }

  // To preserve existing gains for the day, copy them over.
  await db.execAsync(`
    UPDATE skills SET daily_xp_gain = xp_gain WHERE xp_gain > 0;
    UPDATE skills SET weekly_xp_gain = xp_gain WHERE xp_gain > 0;
  `);

  // We can now safely remove the old column.
  // A clean way to do this in SQLite is to create a new table and copy data,
  // as ALTER TABLE DROP COLUMN is only supported in newer versions.
  
  await db.execAsync(`
    CREATE TABLE skills_new (
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
  `);
  
  await db.execAsync(`
    INSERT INTO skills_new (id, member_id, skill_id, skill_name, level, xp, rank, daily_xp_gain, weekly_xp_gain, updated_at)
    SELECT id, member_id, skill_id, skill_name, level, xp, rank, daily_xp_gain, weekly_xp_gain, updated_at FROM skills;
  `);

  await db.execAsync('DROP TABLE skills;');
  await db.execAsync('ALTER TABLE skills_new RENAME TO skills;');
  
  // Recreate indexes
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_skills_member ON skills(member_id);');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(skill_name);');

  console.log('Periodic XP gain migration completed successfully.');
}

async function up() {
  return migrate();
}

async function down() {
  console.log('Reverting migration: Add periodic XP gain columns...');
  // This is a bit more complex as we are dropping a column.
  // For rollback, we'll just add the old column back and assume data loss is acceptable in a rollback scenario.
  await db.execAsync(`
    ALTER TABLE skills ADD COLUMN xp_gain INTEGER DEFAULT 0;
  `);
  // And drop the new columns
  // (Again, using the table recreation method for safety)
   await db.execAsync(`
    CREATE TABLE skills_new (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      member_id INTEGER NOT NULL,
      skill_id INTEGER NOT NULL,
      skill_name TEXT NOT NULL,
      level INTEGER DEFAULT 1,
      xp INTEGER DEFAULT 0,
      rank INTEGER,
      xp_gain INTEGER DEFAULT 0,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
      UNIQUE(member_id, skill_id)
    );
  `);
  
  await db.execAsync(`
    INSERT INTO skills_new (id, member_id, skill_id, skill_name, level, xp, rank, updated_at)
    SELECT id, member_id, skill_id, skill_name, level, xp, rank, updated_at FROM skills;
  `);
  
  await db.execAsync('DROP TABLE skills;');
  await db.execAsync('ALTER TABLE skills_new RENAME TO skills;');
  
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_skills_member ON skills(member_id);');
  await db.execAsync('CREATE INDEX IF NOT EXISTS idx_skills_name ON skills(skill_name);');
  
  console.log('Migration reverted.');
}

module.exports = { migrate, up, down };

// Allow running this script directly to apply the migration
if (require.main === module) {
  up().catch(err => {
    console.error('Failed to apply migration:', err);
    process.exit(1);
  });
}
