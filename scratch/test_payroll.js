const { AdminUser, SalaryStructure } = require('../models/index');
const { sequelize } = require('../config/db');

async function test() {
  try {
    await sequelize.authenticate();
    console.log('Connection has been established successfully.');
    
    const structures = await AdminUser.findAll({
      attributes: ['id', 'name', 'role', 'email'],
      include: [{ model: SalaryStructure, as: 'SalaryStructure' }]
    });
    console.log('Found users:', structures.length);
    structures.forEach((u, i) => {
        console.log(`User ${i}: ${u.name} - Structure: ${u.SalaryStructure ? 'EXISTS' : 'NONE'}`);
        if (u.SalaryStructure) console.log(JSON.stringify(u.SalaryStructure));
    });
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

test();
