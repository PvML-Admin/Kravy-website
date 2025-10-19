const db = require('../config/database');

async function checkPetCategories() {
  try {
    console.log('Checking pet activities...\n');
    
    const petActivities = await db.allAsync(
      "SELECT id, text, category FROM activities WHERE text LIKE '%pet%' OR text LIKE '%grown%' LIMIT 10"
    );
    
    console.log('Sample pet-related activities:');
    petActivities.forEach(activity => {
      console.log(`  ID: ${activity.id} | Category: "${activity.category}" | Text: ${activity.text}`);
    });
    
    console.log('\n---\n');
    
    const petCategoryCount = await db.getAsync(
      "SELECT COUNT(*) as count FROM activities WHERE category = 'Pets'"
    );
    
    console.log(`Activities with category "Pets": ${petCategoryCount.count}`);
    
    // Check for any variations
    const allCategories = await db.allAsync(
      'SELECT DISTINCT category FROM activities ORDER BY category'
    );
    
    console.log('\nAll unique categories in database:');
    allCategories.forEach(cat => {
      console.log(`  "${cat.category}"`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkPetCategories();

