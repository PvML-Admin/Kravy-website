const axios = require('axios');
const db = require('./src/config/database');

async function diagnoseBingoIssue() {
  console.log('🔍 Diagnosing bingo board issues...\n');

  try {
    // 1. Check database connection
    console.log('1. Testing database connection...');
    await db.getAsync('SELECT 1 as test');
    console.log('✅ Database connection successful\n');

    // 2. Check if bingo_boards table exists
    console.log('2. Checking bingo_boards table...');
    const tables = await db.allAsync(`
      SELECT tablename as name FROM pg_tables 
      WHERE tablename='bingo_boards' AND schemaname='public'
    `);
    
    if (tables.length > 0) {
      console.log('✅ bingo_boards table exists');
    } else {
      console.log('❌ bingo_boards table NOT found');
      console.log('   → Run migration: node src/database/migrate-add-bingo-tables.js');
      return;
    }

    // 3. Check if boards exist in database
    console.log('3. Checking for existing boards...');
    const boards = await db.allAsync('SELECT * FROM bingo_boards ORDER BY created_at DESC');
    console.log(`✅ Found ${boards.length} boards in database`);
    
    if (boards.length > 0) {
      console.log('\n📋 Boards in database:');
      for (const board of boards) {
        console.log(`   - ID: ${board.id}, Title: "${board.title}", Active: ${board.is_active}`);
        console.log(`     Start: ${board.start_date || 'Not set'}`);
        console.log(`     End: ${board.end_date || 'Not set'}\n`);
      }
    }

    // 4. Test the API endpoint directly
    console.log('4. Testing API endpoint...');
    try {
      const response = await axios.get('http://localhost:3001/api/bingo/boards');
      console.log('✅ API endpoint responding');
      console.log(`   Response: ${response.data.success ? 'Success' : 'Failed'}`);
      console.log(`   Boards returned: ${response.data.boards?.length || 0}`);
    } catch (apiError) {
      console.log('❌ API endpoint failed:');
      console.log(`   Error: ${apiError.message}`);
      console.log(`   → Check if backend server is running on port 3001`);
    }

    // 5. Check for active boards with current time logic
    console.log('\n5. Checking active board filtering logic...');
    const now = new Date();
    console.log(`   Current time: ${now.toISOString()}`);
    
    const activeBoards = boards.filter(board => {
      if (!board.is_active) return false;
      
      if (board.start_date) {
        const startDate = new Date(board.start_date);
        if (now < startDate) return false;
      }
      
      if (board.end_date) {
        const endDate = new Date(board.end_date);
        if (now > endDate) return false;
      }
      
      return true;
    });
    
    console.log(`   Active boards (after filtering): ${activeBoards.length}`);
    
    if (activeBoards.length === 0 && boards.length > 0) {
      console.log('⚠️  No boards are currently active due to:');
      for (const board of boards) {
        if (!board.is_active) {
          console.log(`   - "${board.title}": is_active = false`);
        } else if (board.start_date && now < new Date(board.start_date)) {
          console.log(`   - "${board.title}": hasn't started yet (starts ${board.start_date})`);
        } else if (board.end_date && now > new Date(board.end_date)) {
          console.log(`   - "${board.title}": has ended (ended ${board.end_date})`);
        }
      }
    }

  } catch (error) {
    console.error('❌ Diagnostic failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n🔧 Likely issue: Database connection failed');
      console.log('   → Check database server is running');
      console.log('   → Verify DATABASE_URL environment variable');
    } else if (error.message.includes('no such table')) {
      console.log('\n🔧 Likely issue: Bingo tables not created');
      console.log('   → Run: node src/database/migrate-add-bingo-tables.js');
    }
  }
}

diagnoseBingoIssue()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Diagnostic script failed:', err);
    process.exit(1);
  });
