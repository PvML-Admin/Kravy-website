const db = require('../../config/database');

async function addCategoryToActivities() {
  console.log('Running migration: Add category column to activities table...');
  const client = await db.pool.connect();
  try {
    // Check if the column already exists to make this script safe to run multiple times
    const res = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name='activities' AND column_name='category'
    `);

    if (res.rowCount === 0) {
      // Column does not exist, so add it
      await client.query('ALTER TABLE activities ADD COLUMN category TEXT');
      console.log('Successfully added "category" column to "activities" table.');
    } else {
      console.log('"category" column already exists in "activities" table. Migration not needed.');
    }
  } catch (err) {
    console.error('Error during migration:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { addCategoryToActivities };
