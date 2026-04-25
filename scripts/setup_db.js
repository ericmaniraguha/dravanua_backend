/**
 * Dravanua Hub - Database Initialization Utility (MySQL)
 *
 * Works only with MySQL.
 * Performs:
 * 1. Connection Authentication
 * 2. Model Synchronization
 * 3. Default Data Seeding
 */

const { sequelize } = require("../config/db");
const models = require("../models");

const { Department, AdminUser } = models;

async function setup() {
  const dialect = sequelize.getDialect();

  if (dialect !== "mysql") {
    throw new Error(
      `This setup script only supports MySQL. Current: ${dialect}`,
    );
  }

  console.log(`\n🚀 Initializing MySQL Database...`);
  console.log("=".repeat(50));

  try {
    // 1. Authenticate connection
    await sequelize.authenticate();
    console.log("✅ MySQL connection established successfully.");

    // 2. Sync models (development only safe mode)
    console.log("🔄 Synchronizing models...");

    const syncOptions =
      process.env.NODE_ENV === "production"
        ? { force: false, alter: false } // production safe
        : { force: false, alter: true }; // dev mode

    await sequelize.sync(syncOptions);

    console.log("✅ Schema synchronization complete.");

    // 3. Seed default departments
    console.log("🌱 Seeding departments...");
    await Department.seedDefaults();

    // 4. Create super admin if not exists
    console.log("👤 Checking Super Admin...");

    const adminCount = await AdminUser.count({
      where: { role: "super_admin" },
    });

    if (adminCount === 0) {
      const generalDept = await Department.findOne({
        where: { code: "general" },
      });

      await AdminUser.create({
        name: "Headquarters",
        email: process.env.ADMIN_EMAIL || "admin@dravanua.com",
        password: process.env.ADMIN_PASSWORD,
        role: "super_admin",
        departmentId: generalDept ? generalDept.id : null,
        isEmailConfirmed: true,
      });

      console.log("✅ Default super admin created.");
    } else {
      console.log("ℹ️ Super admin already exists.");
    }

    console.log("\n🌟 MySQL Setup Complete!");
    console.log("=".repeat(50));

    process.exit(0);
  } catch (error) {
    console.error("\n❌ Setup Failed:");
    console.error(error.message);

    if (error.original) {
      console.error("Original error:", error.original.message);
    }

    process.exit(1);
  }
}

setup();
