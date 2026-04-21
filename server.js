const express = require("express");
const cors = require("cors");
require("dotenv").config();

const { sequelize, connectDB } = require("./config/db");
const { verifyEmailConnection } = require("./utils/sendEmail");

// Import routes
const contactRoutes = require("./routes/contactRoutes");
const adminRoutes = require("./routes/adminRoutes");
const publicRoutes = require("./routes/publicRoutes");
const customerRoutes = require("./routes/customerRoutes");
const payrollRoutes = require("./routes/payrollRoutes");
const orgFinanceRoutes = require("./routes/orgFinanceRoutes");
const subscriptionRoutes = require("./routes/subscriptionRoutes");

const app = express();
const cookieParser = require("cookie-parser");
const PORT = process.env.DRAVANUA_PORT || process.env.BACKEND_PORT || 8003;
const API_PREFIX = process.env.API_V1_STR || "/api/v1";
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Determine allowed origins dynamically from .env
const corsOrigins = process.env.BACKEND_CORS_ORIGINS
  ? process.env.BACKEND_CORS_ORIGINS.split(",").map((url) => url.trim())
  : [
      `http://localhost:${process.env.FRONTEND_PORT || 5173}`,
      "http://localhost:5174",
      "http://localhost:5175",
    ];

// ===== MIDDLEWARE =====
app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  }),
);
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use("/uploads", express.static("uploads"));

// Request Logger
app.use((req, res, next) => {
  const start = Date.now();
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(
      `[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`,
    );
  });
  next();
});

const { authMiddleware } = require("./middleware/authMiddleware");

// ===== ROUTES =====
app.use(`${API_PREFIX}/contact`, contactRoutes);
app.use(`${API_PREFIX}/admin`, adminRoutes);
app.use(`${API_PREFIX}/admin/payroll`, payrollRoutes);
app.use(`${API_PREFIX}/admin/org-finance`, orgFinanceRoutes);
app.use(
  `${API_PREFIX}/admin/subscriptions`,
  authMiddleware,
  subscriptionRoutes,
);
app.use(`${API_PREFIX}/public`, publicRoutes);
app.use(`${API_PREFIX}/customer`, customerRoutes);

// API v1 root index
app.get(API_PREFIX, (req, res) => {
  res.status(200).json({
    name: process.env.PROJECT_NAME || "DRAVANUA HUB API",
    version: process.env.PROJECT_VERSION || "1.0.0",
    status: "Running",
    endpoints: {
      health:    `${API_PREFIX}/health`,
      contact:   `${API_PREFIX}/contact`,
      admin:     `${API_PREFIX}/admin`,
      public:    `${API_PREFIX}/public`,
      customer:  `${API_PREFIX}/customer`,
    },
  });
});

// Simple health check
app.get(`${API_PREFIX}/health`, (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "System is healthy",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

// Database health check (useful for monitoring and debugging)
// Disabled in production by default - enable via DB_CHECK_ENDPOINT=true
if (
  process.env.DB_CHECK_ENDPOINT === "true" ||
  process.env.NODE_ENV !== "production"
) {
  app.get(`${API_PREFIX}/db-check`, async (req, res) => {
    try {
      await sequelize.authenticate();
      const tableCount = Object.keys(sequelize.models).length;
      res.status(200).json({
        database: "connected",
        models: tableCount,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      res.status(500).json({
        database: "failed",
        error: err.message,
        timestamp: new Date().toISOString(),
      });
    }
  });
}

// ===== HEALTH CHECK =====
app.get("/", (req, res) => {
  res.json({
    name: process.env.PROJECT_NAME || "DRAVANUA HUB API",
    version: process.env.PROJECT_VERSION || "1.0.0",
    status: "Running",
    brand:
      process.env.PROJECT_BRAND_SLOGAN || "DRAVANUA HUB — Here to Create 🌿",
    endpoints: {
      contact: `${API_PREFIX}/contact`,
      projects: `${API_PREFIX}/projects`,
      admin: `${API_PREFIX}/admin`,
      public: `${API_PREFIX}/public`,
    },
  });
});

// ===== ERROR HANDLER =====
app.use((err, req, res, next) => {
  console.error("Server Error:", err.stack);
  res.status(500).json({ error: "Internal server error" });
});

// ===== START SERVER =====
const startServer = async () => {
  console.log("");
  console.log(
    `🌿 ${process.env.PROJECT_NAME || "DRAVANUA HUB"} Backend Starting...`,
  );
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`📌 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log("");

  // ===== STEP 1: Connect to Database =====
  console.log("📡 Step 1: Connecting to database...");
  try {
    await connectDB();
    console.log("✅ Database connected successfully");
  } catch (err) {
    console.error("❌ Fatal Database Error:", err.message);
    console.error("   Unable to connect to database. Aborting startup.");
    process.exit(1); // CRITICAL: Exit immediately if DB connection fails
  }

  // ===== STEP 2: Load Models =====
  console.log("");
  console.log("📋 Step 2: Loading models...");
  try {
    require("./models/index");
    console.log("✅ Models loaded successfully");
  } catch (err) {
    console.error("❌ Fatal Error loading models:", err.message);
    process.exit(1);
  }

  // ===== STEP 3: Synchronize Database Schema =====
  console.log("");
  console.log("🔄 Step 3: Synchronizing database schema...");
  try {
    // IMPORTANT: `alter: true` is disabled — it causes MySQL to exceed
    // the 64-index limit per table when re-running on existing schemas.
    // `force: false` = CREATE TABLE IF NOT EXISTS (safe for fresh & existing DBs)
    // For schema changes, use: npx sequelize-cli db:migrate
    const syncOptions = { force: false };

    await sequelize.sync(syncOptions);
    console.log("✅ All database tables synchronized");

    // Optional: Add detailed schema info
    const models = Object.keys(sequelize.models);
    console.log(
      `   Created/updated ${models.length} tables: ${models.join(", ")}`,
    );
  } catch (syncError) {
    console.error("❌ Database synchronization failed:", syncError.message);
    console.error(
      "   Ensure your database credentials and connection are correct.",
    );
    process.exit(1); // CRITICAL: Exit if schema sync fails
  }

  // ===== STEP 4: Seed Default Data =====
  console.log("");
  console.log("🌱 Step 4: Seeding default data...");
  try {
    const { AdminUser, Department, ServiceModule } = require("./models/index");

    // Seed departments
    await Department.seedDefaults();
    console.log("✅ Default departments seeded");

    // Seed Service Modules
    await ServiceModule.seedDefaults();
    console.log("✅ Service Modules seeded");

    // Auto-provision Super Admin
    const adminEmail = process.env.ADMIN_EMAIL || "admin@dravanua.com";
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || "Super Admin";

    const existingAdmin = await AdminUser.findOne({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      if (adminPassword) {
        const headDeptId = await Department.resolveId("General Administration");
        await AdminUser.create({
          name: adminName,
          email: adminEmail,
          password: adminPassword,
          role: "super_admin",
          isActive: true,
          isEmailConfirmed: true,
          departmentId: headDeptId,
        });
        console.log(`👤 Super Admin created: ${adminEmail}`);
      } else {
        console.warn(
          "⚠️  WARNING: No Super Admin found and ADMIN_PASSWORD is not set in .env",
        );
        console.warn(
          "   To create a super admin, set ADMIN_PASSWORD in your .env file",
        );
      }
    } else {
      console.log(`👤 Super Admin already exists: ${adminEmail}`);
    }
  } catch (seedError) {
    console.error("⚠️  Warning: Data seeding failed:", seedError.message);
    console.warn(
      "   Database may be partially initialized. Check your models.",
    );
    // Don't exit here - seeding failure shouldn't stop the server
  }

  // ===== STEP 5: Verify Email Service =====
  console.log("");
  console.log("📧 Step 5: Verifying email service...");
  try {
    await verifyEmailConnection();
    console.log("✅ Email service connected");
  } catch (emailError) {
    console.warn(
      "⚠️  Warning: Email service connection failed:",
      emailError.message,
    );
    console.warn(
      "   Email features may not work. Check your SMTP configuration.",
    );
    // Don't exit here - email failure shouldn't stop the server
  }

  // ===== STEP 6: Start HTTP Server =====
  console.log("");
  console.log("🚀 Step 6: Starting HTTP server...");

  app
    .listen(PORT, () => {
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`📡 API Base: ${BASE_URL}${API_PREFIX}`);
      console.log(`🏥 Health Check: ${BASE_URL}${API_PREFIX}/health`);
      console.log(`🔍 DB Check: ${BASE_URL}${API_PREFIX}/db-check`);
      console.log(`📖 Documentation: ${BASE_URL}/`);
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log("");
      console.log("✨ Backend is ready to accept requests!");
      console.log("");
    })
    .on("error", (err) => {
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.error("❌ Failed to start HTTP server:", err.message);
      console.error("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      if (err.code === "EADDRINUSE") {
        console.error(`   Port ${PORT} is already in use.`);
        console.error(`   Either stop the process using that port,`);
        console.error(`   or set a different DRAVANUA_PORT in your .env`);
      }
      process.exit(1);
    });
};

startServer();
