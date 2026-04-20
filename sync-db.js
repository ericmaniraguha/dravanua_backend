require("dotenv").config();

const { sequelize } = require("./config/db");
const { AdminUser, Department } = require("./models");

async function syncDatabase() {
  console.log("🚀 Starting Database Initialization...");
  console.log("✨ Applying schema and seeding core data...\n");

  try {
    // 1. Test DB connection
    await sequelize.authenticate();
    console.log("✅ Database connection successful");

    // 2. Sync models safely (NO DATA LOSS)
    await sequelize.sync({ alter: true });
    console.log("✅ Schema synchronized successfully");

    // 3. Seed default departments
    console.log("🌱 Seeding departments...");
    await Department.seedDefaults();

    // 4. Create Super Admin (if not exists)
    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || "Super Admin";

    if (!adminEmail || !adminPassword) {
      console.warn(
        "⚠️ ADMIN_EMAIL or ADMIN_PASSWORD missing. Skipping admin creation.",
      );
    } else {
      const existingAdmin = await AdminUser.findOne({
        where: { email: adminEmail },
      });

      if (!existingAdmin) {
        const deptId = await Department.resolveId("General Administration");

        await AdminUser.create({
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          role: "super_admin",
          isActive: true,
          isEmailConfirmed: true,
          departmentId: deptId,
        });

        console.log(`👤 Super Admin created: ${adminEmail}`);
      } else {
        console.log("ℹ️ Super Admin already exists");
      }
    }

    console.log("\n🎉 DATABASE INITIALIZATION COMPLETE");
    console.log("----------------------------------");
    console.log("✔ Schema ready");
    console.log("✔ Core data seeded");
    console.log("✔ Super admin verified");
    console.log("----------------------------------\n");

    process.exit(0);
  } catch (error) {
    console.error("\n❌ DATABASE INITIALIZATION FAILED:");
    console.error(error.message);
    process.exit(1);
  }
}

syncDatabase();
