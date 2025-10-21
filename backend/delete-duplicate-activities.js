const db = require('./src/config/database');

async function deleteDuplicateActivities() {
  try {
    console.log('🔍 Finding duplicate recent activities...');
    
    // Find duplicates based on member_id, activity_date, and text
    const duplicates = await db.allAsync(`
      SELECT 
        member_id,
        activity_date,
        text,
        COUNT(*) as count,
        MIN(id) as keep_id,
        ARRAY_AGG(id ORDER BY id) as all_ids
      FROM activities 
      WHERE activity_date > (EXTRACT(epoch FROM NOW() - INTERVAL '7 days') * 1000)
      GROUP BY member_id, activity_date, text
      HAVING COUNT(*) > 1
      ORDER BY COUNT(*) DESC
    `);
    
    if (duplicates.length === 0) {
      console.log('✅ No duplicate activities found in the last 7 days!');
      return;
    }
    
    console.log(`\n🚨 Found ${duplicates.length} sets of duplicate activities:`);
    
    let totalDuplicatesToDelete = 0;
    for (const dup of duplicates) {
      const memberName = await db.getAsync(`
        SELECT name, display_name FROM members WHERE id = ?
      `, [dup.member_id]);
      
      const activityDate = new Date(parseInt(dup.activity_date));
      console.log(`- Member: ${memberName?.display_name || memberName?.name || 'Unknown'}`);
      console.log(`  Activity: "${dup.text}"`);
      console.log(`  Date: ${activityDate.toISOString()}`);
      console.log(`  Count: ${dup.count} duplicates`);
      console.log(`  IDs: ${dup.all_ids}`);
      console.log(`  Keeping ID: ${dup.keep_id}, deleting ${dup.count - 1} duplicates\n`);
      
      totalDuplicatesToDelete += (dup.count - 1);
    }
    
    console.log(`\n📊 Summary: Found ${totalDuplicatesToDelete} duplicate activities to delete`);
    console.log('Proceeding with deletion (keeping the oldest entry of each duplicate set)...\n');
    
    // Delete duplicates (keep the one with MIN(id) which is the oldest)
    let deletedCount = 0;
    for (const dup of duplicates) {
      // Parse the all_ids array (it comes as a string like "{1,2,3}")
      const idsArray = dup.all_ids.replace(/[{}]/g, '').split(',').map(id => parseInt(id.trim()));
      const idsToDelete = idsArray.filter(id => id !== dup.keep_id);
      
      if (idsToDelete.length > 0) {
        const placeholders = idsToDelete.map(() => '?').join(',');
        const result = await db.runAsync(`
          DELETE FROM activities 
          WHERE id IN (${placeholders})
        `, idsToDelete);
        
        deletedCount += result.changes;
        console.log(`✅ Deleted ${result.changes} duplicates for activity: "${dup.text.substring(0, 50)}..."`);
      }
    }
    
    console.log(`\n🎉 Successfully deleted ${deletedCount} duplicate activities!`);
    console.log(`📈 Database cleanup complete. Each unique activity now has only one entry.`);
    
  } catch (error) {
    console.error('❌ Error cleaning up duplicate activities:', error);
  } finally {
    process.exit(0);
  }
}

deleteDuplicateActivities();
