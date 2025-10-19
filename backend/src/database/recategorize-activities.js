const db = require('../config/database');
const { categorizeActivity } = require('../utils/activityCategorizer');

async function recategorizeAllActivities() {
  console.log('Starting recategorization of all activities...');
  
  try {
    // Get all activities
    const activities = await db.allAsync('SELECT id, text, details FROM activities');
    console.log(`Found ${activities.length} activities to recategorize`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const activity of activities) {
      try {
        // Recategorize using the updated logic
        const newCategory = categorizeActivity(activity.text, activity.details || '');
        
        // Update the activity with the new category
        await db.runAsync(
          'UPDATE activities SET category = ? WHERE id = ?',
          [newCategory, activity.id]
        );
        
        updatedCount++;
        
        // Log progress every 100 activities
        if (updatedCount % 100 === 0) {
          console.log(`Progress: ${updatedCount}/${activities.length} activities recategorized`);
        }
      } catch (error) {
        console.error(`Error recategorizing activity ${activity.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('\n✅ Recategorization complete!');
    console.log(`   - Successfully updated: ${updatedCount} activities`);
    console.log(`   - Errors: ${errorCount} activities`);
    
    // Show category breakdown
    const categoryStats = await db.allAsync(`
      SELECT category, COUNT(*) as count 
      FROM activities 
      GROUP BY category 
      ORDER BY count DESC
    `);
    
    console.log('\n📊 Category breakdown:');
    categoryStats.forEach(stat => {
      console.log(`   - ${stat.category}: ${stat.count} activities`);
    });

  } catch (error) {
    console.error('Fatal error during recategorization:', error);
    process.exit(1);
  }
}

// Run the migration
recategorizeAllActivities()
  .then(() => {
    console.log('\n✨ All done! You can now restart your server.');
    process.exit(0);
  })
  .catch(error => {
    console.error('Migration failed:', error);
    process.exit(1);
  });

