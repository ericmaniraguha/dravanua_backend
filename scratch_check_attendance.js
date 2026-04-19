const { Attendance } = require('./models');
const { sequelize } = require('./config/db');

async function check() {
  try {
    await sequelize.authenticate();
    const count = await Attendance.count();
    const latest = await Attendance.findOne({ order: [['createdAt', 'DESC']] });
    console.log('Attendance Count:', count);
    if (latest) {
      console.log('Latest Record:', JSON.stringify(latest, null, 2));
    }
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    process.exit();
  }
}

check();
