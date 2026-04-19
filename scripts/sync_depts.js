const Department = require('../models/Department');
const { sequelize } = require('../config/db');

async function syncDepts() {
  console.log('🔄 Syncing Departments...');
  
  const depts = [
    { name: 'Studio', code: 'studio' },
    { name: 'Stationery & Office Supplies', code: 'papeterie' },
    { name: 'Flower Gifts', code: 'flower_gifts' },
    { name: 'Classic Fashion', code: 'classic_fashion' },
    { name: 'Marketing', code: 'marketing' },
    { name: 'Management & Admin', code: 'management_admin' },
    { name: 'General', code: 'general' }
  ];

  for (const item of depts) {
    const [dept, created] = await Department.findOrCreate({
      where: { code: item.code },
      defaults: item
    });
    if (created) console.log(`✅ Created: ${item.name}`);
    else console.log(`ℹ️ Exists: ${item.name}`);
  }

  console.log('✨ All departments synced.');
  process.exit(0);
}

syncDepts().catch(err => {
  console.error(err);
  process.exit(1);
});
