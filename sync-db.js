require("dotenv").config();

const { sequelize } = require("./config/db");
const models = require("./models");

async function syncDatabase() {
  console.log("🚀 Starting Database Initialization...");
  console.log("📦 Loading models...");

  try {
    // 1. Ensure models are loaded
    await sequelize.authenticate();
    console.log("✅ Database connection successful");

    // 2. Show registered models (DEBUG)
    console.log("📊 Registered Models:", Object.keys(sequelize.models));

    // 3. Sync ALL models
    await sequelize.sync({ alter: true });
    console.log("✅ Schema synchronized successfully");

    // 4. Check if tables exist
    const [results] = await sequelize.query("SHOW TABLES");
    console.log("📋 Tables in DB:", results);

    // 5. Seed departments safely
    const Department = sequelize.models.Department;

    if (Department && Department.seedDefaults) {
      console.log("🌱 Seeding departments...");
      await Department.seedDefaults();
    } else {
      console.log("⚠️ Department seed method not found");
    }

    // 6. Create super admin safely
    const AdminUser = sequelize.models.AdminUser;

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || "Super Admin";

    if (adminEmail && adminPassword && AdminUser) {
      const existing = await AdminUser.findOne({
        where: { email: adminEmail },
      });

      if (!existing) {
        await AdminUser.create({
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          role: "super_admin",
          isActive: true,
          isEmailConfirmed: true,
        });

        console.log(`👤 Super Admin created: ${adminEmail}`);
      } else {
        console.log("ℹ️ Super Admin already exists");
      }
    } else {
      console.log("⚠️ Admin creation skipped (missing config)");
    }

    console.log("\n🎉 DATABASE INITIALIZATION COMPLETE");
  } catch (error) {
    console.error("\n❌ DATABASE INIT FAILED:");
    console.error(error.message);
    process.exit(1);
  }
}

syncDatabase();
