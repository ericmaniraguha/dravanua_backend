const { sequelize } = require('../config/db');

async function migrateBookings() {
  console.log('🚀 Starting Bookings Migration...');
  const queryInterface = sequelize.getQueryInterface();
  
  try {
    const columns = await queryInterface.describeTable('bookings');
    
    if (!columns.payment_method) {
      console.log('➕ Adding payment_method to bookings...');
      await queryInterface.addColumn('bookings', 'payment_method', {
        type: require('sequelize').DataTypes.STRING,
        allowNull: true
      });
    }
    
    if (!columns.payment_account) {
      console.log('➕ Adding payment_account to bookings...');
      await queryInterface.addColumn('bookings', 'payment_account', {
        type: require('sequelize').DataTypes.STRING,
        allowNull: true
      });
    }
    
    console.log('✨ Bookings Migration Complete.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  }
}

migrateBookings();
