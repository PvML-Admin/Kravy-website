const db = require('../config/database');

async function addCapes() {
  console.log('Running migration: addCapes');
  try {
    // PostgreSQL query to check if a column exists
    const columnExists = async (colName) => {
      try {
        const result = await db.getAsync(
          `SELECT column_name 
           FROM information_schema.columns 
           WHERE table_name = 'members' AND column_name = $1`,
          [colName]
        );
        console.log(`Checking if column ${colName} exists:`, result);
        return result != null; // Check for both null and undefined
      } catch (err) {
        console.error(`Error checking if column ${colName} exists:`, err);
        return false;
      }
    };

    // Add has_master_quest_cape
    if (!(await columnExists('has_master_quest_cape'))) {
      console.log('Adding column has_master_quest_cape...');
      await db.runAsync('ALTER TABLE members ADD COLUMN has_master_quest_cape BOOLEAN DEFAULT FALSE');
      console.log('✓ Column has_master_quest_cape added successfully.');
    } else {
      console.log('✓ Column has_master_quest_cape already exists.');
    }

    // Add has_completionist_cape
    if (!(await columnExists('has_completionist_cape'))) {
      console.log('Adding column has_completionist_cape...');
      await db.runAsync('ALTER TABLE members ADD COLUMN has_completionist_cape BOOLEAN DEFAULT FALSE');
      console.log('✓ Column has_completionist_cape added successfully.');
    } else {
      console.log('✓ Column has_completionist_cape already exists.');
    }

    // Add has_trimmed_completionist_cape
    if (!(await columnExists('has_trimmed_completionist_cape'))) {
      console.log('Adding column has_trimmed_completionist_cape...');
      await db.runAsync('ALTER TABLE members ADD COLUMN has_trimmed_completionist_cape BOOLEAN DEFAULT FALSE');
      console.log('✓ Column has_trimmed_completionist_cape added successfully.');
    } else {
      console.log('✓ Column has_trimmed_completionist_cape already exists.');
    }

    console.log('Migration addCapes completed successfully.');
  } catch (err) {
    console.error('Error running addCapes migration:', err);
    throw err;
  }
}

module.exports = { addCapes };
