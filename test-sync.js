const { sequelize } = require('./config/db');
require('./models/index');

const testSync = async () => {
  try {
    console.log('Attempting to sync models with PostgreSQL...');
    await sequelize.authenticate();
    console.log('Connection successful!');
    
    // Force sync to see if it creates anything
    await sequelize.sync({ force: false, alter: true });
    console.log('Sync complete! Check your database now.');
    process.exit(0);
  } catch (err) {
    console.error('Error during sync:', err);
    process.exit(1);
  }
};

testSync();
