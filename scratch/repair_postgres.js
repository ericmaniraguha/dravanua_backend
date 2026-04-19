const { sequelize } = require('../config/db');

async function repairPostgres() {
  try {
    await sequelize.authenticate();
    console.log("Connected to PostgreSQL for schema repair.");
    
    // Add location column
    try {
      await sequelize.query(`ALTER TABLE bookings ADD COLUMN location VARCHAR(255) DEFAULT 'Studio';`);
      console.log("Added 'location' to bookings table.");
    } catch (e) {
      console.log("location column might already exist or error: ", e.message);
    }
    
    // Add phone_number column
    try {
      await sequelize.query(`ALTER TABLE bookings ADD COLUMN phone_number VARCHAR(255);`);
      console.log("Added 'phone_number' to bookings table.");
    } catch (e) {
      console.log("phone_number column might already exist or error: ", e.message);
    }
    
    console.log("\n✅ PostgreSQL Schema repair complete.");
  } catch (err) {
    console.error("Error repairing Postgres:", err);
  } finally {
    process.exit(0);
  }
}

repairPostgres();
