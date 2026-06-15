const { getConnection } = require('../db/oracle');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  let conn;
  try {
    conn = await getConnection();
    console.log('✅ Connected to Oracle database');

    // Read and execute the migration script
    const migrationPath = path.join(__dirname, '../migrations/add_rider_earnings.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split SQL into individual statements (simplified for this specific migration)
    const statements = migrationSQL.split('/').filter(stmt => stmt.trim() !== '');
    
    for (let stmt of statements) {
      if (stmt.trim()) {
        try {
          await conn.execute(stmt.trim());
          console.log('✅ Executed migration statement');
        } catch (err) {
          // Ignore "table or view does not exist" errors when dropping
          if (!err.message.includes('ORA-00942')) {
            console.error('⚠️  Migration statement warning:', err.message);
          }
        }
      }
    }

    await conn.commit();
    console.log('🎉 Rider earnings migration applied successfully!');
    
  } catch (err) {
    console.error('❌ Failed to apply migration:', err);
    if (conn) await conn.rollback();
  } finally {
    if (conn) await conn.close();
  }
}

applyMigration();
