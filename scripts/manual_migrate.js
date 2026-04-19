const { sequelize } = require('../config/db');

async function migrate() {
  console.log('🚀 Manual Migration Started...');
  const tables = ['daily_reports', 'expenses', 'purchases', 'daily_floats', 'daily_requests'];
  
  for (const table of tables) {
    console.log(`🛠 Checking table: ${table}`);
    try {
      await sequelize.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS payment_method VARCHAR(255);`);
      await sequelize.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS payment_account VARCHAR(255);`);
      await sequelize.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS notes TEXT;`);
      console.log(`✅ Table ${table} updated.`);
    } catch (err) {
      console.error(`❌ Error updating table ${table}:`, err.message);
    }
  }
  
  // Specific for daily_reports: migrate 'terms' to 'payment_method' if possible
  try {
    console.log('🔄 Migrating DailyReport data...');
    await sequelize.query(`UPDATE daily_reports SET payment_method = terms WHERE payment_method IS NULL AND terms IS NOT NULL;`);
    console.log('✅ Data migration complete.');
  } catch (err) {
    console.log('ℹ️ Data migration skipped or failed (might already be done).');
  }

  console.log('🌟 Manual Migration Complete!');
  process.exit(0);
}

migrate();
