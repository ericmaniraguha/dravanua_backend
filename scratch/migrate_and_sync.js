const { sequelize } = require('../config/db');

async function migrateData() {
  const t = await sequelize.transaction();
  try {
    console.log('Migrating "Sale" to "Revenue" in transactions table...');
    await sequelize.query("UPDATE transactions SET type = 'Revenue' WHERE type = 'Sale'", { transaction: t });
    
    console.log('Synchronizing DB schema...');
    await sequelize.sync({ alter: true, transaction: t });
    
    await t.commit();
    console.log('✅ Migration and Sync completed successfully');
    process.exit(0);
  } catch (err) {
    await t.rollback();
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrateData();
