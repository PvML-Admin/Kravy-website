const db = require('../config/database');

/**
 * Fix corrupted names in the database by removing/replacing invalid characters
 */
async function fixCorruptedNames() {
  console.log('Starting to fix corrupted member names...');

  try {
    // Get all members
    const members = await db.allAsync('SELECT id, name, display_name FROM members');
    
    let fixed = 0;
    let errors = 0;

    for (const member of members) {
      try {
        // Check if name contains the Unicode replacement character or other invalid chars
        const hasInvalidChars = /[\uFFFD\u00A0\u200B-\u200D\uFEFF]/.test(member.name) || 
                               /[\uFFFD\u00A0\u200B-\u200D\uFEFF]/.test(member.display_name);
        
        if (hasInvalidChars) {
          // Clean the name by replacing invalid characters with regular space
          const cleanName = member.name
            .replace(/[\uFFFD\u00A0\u200B-\u200D\uFEFF]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
            .toLowerCase();
          
          const cleanDisplayName = member.display_name
            .replace(/[\uFFFD\u00A0\u200B-\u200D\uFEFF]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();

          console.log(`Fixing: "${member.display_name}" -> "${cleanDisplayName}"`);

          // Update the database
          await db.runAsync(
            'UPDATE members SET name = ?, display_name = ? WHERE id = ?',
            [cleanName, cleanDisplayName, member.id]
          );

          fixed++;
        }
      } catch (err) {
        console.error(`Error fixing member ${member.id}:`, err);
        errors++;
      }
    }

    console.log(`\nFixed ${fixed} corrupted names`);
    if (errors > 0) {
      console.log(`Failed to fix ${errors} names`);
    }
    
    return { fixed, errors, total: members.length };
  } catch (error) {
    console.error('Error fixing corrupted names:', error);
    throw error;
  }
}

// Allow running this script directly
if (require.main === module) {
  fixCorruptedNames()
    .then((result) => {
      console.log('\nDone!', result);
      process.exit(0);
    })
    .catch(err => {
      console.error('Failed to fix names:', err);
      process.exit(1);
    });
}

module.exports = { fixCorruptedNames };

