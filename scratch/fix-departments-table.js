require('dotenv').config();
const { sequelize } = require('../config/db');

const fix = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL');

    // Disable FK checks so we can drop tables in any order
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 0');
    console.log('⚙️  FK checks disabled');

    // Get all tables in the database
    const [tables] = await sequelize.query(
      `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES 
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_TYPE = 'BASE TABLE'`
    );

    console.log(`Found ${tables.length} tables to drop:`, tables.map(t => t.TABLE_NAME).join(', '));

    for (const { TABLE_NAME } of tables) {
      await sequelize.query(`DROP TABLE IF EXISTS \`${TABLE_NAME}\``);
      console.log(`  ✓ Dropped ${TABLE_NAME}`);
    }

    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log('\n✅ All tables dropped. Run npm run dev to recreate them correctly.');
  } catch (err) {
    console.error('❌ Fix failed:', err.message);
    await sequelize.query('SET FOREIGN_KEY_CHECKS = 1').catch(() => {});
  } finally {
    await sequelize.close();
  }
};

fix();
