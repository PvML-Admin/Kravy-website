const db = require('../config/database');

async function checkCategories() {
  try {
    console.log('Checking citadel activities...\n');
    
    const citadelActivities = await db.allAsync(
      "SELECT text, category FROM activities WHERE text LIKE '%Citadel%' OR text LIKE '%Fealty%' LIMIT 10"
    );
    
    console.log('Sample citadel-related activities:');
    citadelActivities.forEach(activity => {
      console.log(`  Category: "${activity.category}" | Text: ${activity.text}`);
    });
    
    console.log('\n---\n');
    
    const categoryCounts = await db.allAsync(
      'SELECT category, COUNT(*) as count FROM activities GROUP BY category ORDER BY count DESC'
    );
    
    console.log('All category counts:');
    categoryCounts.forEach(cat => {
      console.log(`  ${cat.category}: ${cat.count} activities`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkCategories();

