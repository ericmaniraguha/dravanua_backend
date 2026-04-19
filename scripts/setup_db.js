/**
 * Dravanua Hub - Database Initialization & Migration Utility
 *
 * Works for both SQLite and PostgreSQL.
 * Performs:
 * 1. Connection Authentication
 * 2. Model Synchronization (Table Creation)
 * 3. Default Data Seeding
 */

const { sequelize } = require("../config/db");
const models = require("../models"); // Loads index.js with all associations
const { Department, AdminUser } = models;

async function setup() {
  const dialect = sequelize.getDialect();
  console.log(`\n🚀 Initializing ${dialect.toUpperCase()} Database...`);
  console.log("=".repeat(50));

  try {
    // 1. Authenticate
    await sequelize.authenticate();
    console.log("✅ Connection established successfully.");

    // 2. Enable PostGIS for PostgreSQL
    if (dialect === "postgres") {
      console.log("🌍 Enabling PostGIS extension...");
      await sequelize.query("CREATE EXTENSION IF NOT EXISTS postgis;");
    }

    // 2. Sync Models
    // For production, use { alter: true }.
    // For fresh start in dev, you can use { force: true } (WIPES ALL DATA).
    console.log("🔄 Synchronizing models (creating tables)...");
    await sequelize.sync({ force: false, alter: true });
    console.log("✅ Schema synchronization complete.");

    // 3. Seed Departments
    console.log("🌱 Seeding departments...");
    await Department.seedDefaults();

    // 4. Seed Super Admin
    console.log("👤 Checking Super Admin status...");
    const adminCount = await AdminUser.count({
      where: { role: "super_admin" },
    });
    if (adminCount === 0) {
      const generalDept = await Department.findOne({
        where: { code: "general" },
      });
      await AdminUser.create({
        name: "Headquarters",
        email: process.env.ADMIN_EMAIL || "ericmaniraguha@gmail.com",
        password: process.env.ADMIN_PASSWORD || "AdminPassword123!",
        role: "super_admin",
        departmentId: generalDept ? generalDept.id : null,
        isEmailConfirmed: true,
      });
      console.log("✅ Default super admin created.");
    } else {
      console.log("ℹ️  Super admin already exists.");
    }

    console.log("\n🌟 Database Setup Complete!");
    console.log("=".repeat(50));
    process.exit(0);
  } catch (error) {
    console.error("\n❌ Setup Failed:");
    console.error(error.message);
    if (error.original)
      console.error("Original error:", error.original.message);
    process.exit(1);
  }
}

setup();
