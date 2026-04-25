const { sequelize } = require('../config/db');

async function migrateData() {
  const t = await sequelize.transaction();
  try {
    console.log('Temporarily changing "type" column to VARCHAR to allow migration...');
    await sequelize.query("ALTER TABLE transactions MODIFY type VARCHAR(255)", { transaction: t });
    
    console.log('Updating "Sale" to "Revenue"...');
    await sequelize.query("UPDATE transactions SET type = 'Revenue' WHERE type = 'Sale'", { transaction: t });
    
    console.log('Synchronizing DB schema (this will restore the ENUM)...');
    // We load models here to make sure they are in memory
    require('../models');
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
