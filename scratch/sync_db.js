const { sequelize } = require('../config/db');
require('../models'); // Load models

async function syncDB() {
  try {
    console.log('Starting DB sync (alter: true)...');
    await sequelize.sync({ alter: true });
    console.log('✅ DB synchronized successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ DB sync failed:', err);
    process.exit(1);
  }
}

syncDB();
