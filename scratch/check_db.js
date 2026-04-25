const { sequelize } = require('../config/db');

async function checkTypes() {
  try {
    const [results] = await sequelize.query("SELECT DISTINCT type FROM transactions");
    console.log('Current types in DB:', results);
    process.exit(0);
  } catch (err) {
    console.error('Query failed:', err);
    process.exit(1);
  }
}

checkTypes();
