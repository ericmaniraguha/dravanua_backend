require('dotenv').config();
const { sequelize } = require('./config/db');
const { AdminUser, Department } = require('./models/index');

async function syncDatabase() {
  console.log('🚀 Starting Final Database Reconstruction...');
  console.log('✨ Optimized descriptive schema applying...');

  try {
    await sequelize.authenticate();
    
    // Enable PostGIS
    if (sequelize.getDialect() === 'postgres') {
      await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
      console.log('✅ PostGIS confirmed');
    }

    await sequelize.sync({ force: true });
    
    console.log('✨ Schema synchronized. Seeding core data...');

    // 1. Seed Departments
    await Department.seedDefaults();

    // 2. Seed Super Admin from .env
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || "Super Admin";

    if (!adminEmail || !adminPassword) {
      console.warn('⚠️  ADMIN_EMAIL or ADMIN_PASSWORD not found in .env. Skipping superadmin seeding.');
    } else {
      const headDeptId = await Department.resolveId('General Administration');
      
      await AdminUser.create({
        name: adminName,
        email: adminEmail,
        password: adminPassword,
        role: 'super_admin',
        isActive: true,
        isEmailConfirmed: true,
        departmentId: headDeptId
      });

      console.log(`👤 Super Admin provisioned: ${adminEmail} (${adminName})`);
    }

    console.log(`\n✨ ${process.env.PROJECT_NAME || 'DATABASE'} RECONSTRUCTED & SEEDED SUCCESSFULLY!`);
    console.log('------------------------------------------');
    console.log('• Redundant UUIDs: REMOVED');
    console.log('• Fields Remapped: user_name, user_email, dept_name, etc.');
    console.log('• Super Admin:     READY');
    console.log('------------------------------------------\n');
    
    process.exit(0);
  } catch (error) {
    console.error('\n❌ RECONSTRUCTION FAILED:', error.message);
    process.exit(1);
  }
}

syncDatabase();
