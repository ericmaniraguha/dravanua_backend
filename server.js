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
const itemRoutes = require("./routes/itemRoutes");
const uploadRoutes = require("./routes/uploadRoutes");
const assetRoutes = require("./routes/assetRoutes");
const treasuryRoutes = require("./routes/treasuryRoutes");
const gpsAttendanceRoutes = require("./routes/gpsAttendanceRoutes");

const app = express();
const cookieParser = require("cookie-parser");
const PORT = process.env.DRAVANUA_PORT || 8003;
const API_PREFIX = process.env.API_V1_STR || "/api/v1";
const BASE_URL = process.env.BASE_URL;

// Determine allowed origins dynamically from .env
const corsOrigins = process.env.BACKEND_CORS_ORIGINS
  ? process.env.BACKEND_CORS_ORIGINS.split(",").map((url) => url.trim())
  : ["*"];

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
const fs = require("fs");
if (!fs.existsSync("uploads")) {
  fs.mkdirSync("uploads", { recursive: true });
}
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
app.use(`${API_PREFIX}/admin/items`, itemRoutes);
app.use(
  `${API_PREFIX}/admin/subscriptions`,
  authMiddleware,
  subscriptionRoutes,
);
app.use(`${API_PREFIX}/public`, publicRoutes);
app.use(`${API_PREFIX}/customer`, customerRoutes);
app.use(`${API_PREFIX}/admin/uploads`, authMiddleware, uploadRoutes);
app.use(`${API_PREFIX}/admin/assets`, authMiddleware, assetRoutes);
app.use(`${API_PREFIX}/admin/treasury`, treasuryRoutes);
app.use(`${API_PREFIX}/admin/attendance`, gpsAttendanceRoutes);

// API v1 root index
app.get(API_PREFIX, (req, res) => {
  res.status(200).json({
    name: process.env.PROJECT_NAME || "DRA VANUA GROUP LTD API",
    version: process.env.PROJECT_VERSION || "1.0.0",
    status: "Running",
    endpoints: {
      health: `${API_PREFIX}/health`,
      contact: `${API_PREFIX}/contact`,
      admin: `${API_PREFIX}/admin`,
      public: `${API_PREFIX}/public`,
      customer: `${API_PREFIX}/customer`,
    },
  });
});

app.get(`${API_PREFIX}/health`, (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

// ROOT HEALTHCHECK (For Docker)
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

const redis = require("./utils/redis");
const { triggerAiTask } = require("./utils/ai_trigger");

app.get(`${API_PREFIX}/test-ai`, async (req, res) => {
  try {
    const data = req.query.data || "Test AI Data";
    const taskId = await triggerAiTask(data);
    res.status(200).json({ 
      status: "Task Triggered", 
      taskId, 
      message: "Check ai_worker logs for processing results." 
    });
  } catch (error) {
    res.status(500).json({ status: "Error", message: error.message });
  }
});

app.get(`${API_PREFIX}/db-check`, async (req, res) => {
  try {
    await sequelize.authenticate();
    
    let redisStatus = "Disconnected";
    try {
      await redis.ping();
      redisStatus = "Connected";
    } catch (e) {
      redisStatus = `Error: ${e.message}`;
    }

    res.status(200).json({ 
      status: "OK", 
      database: "Connected", 
      redis: redisStatus,
      timestamp: new Date() 
    });
  } catch (error) {
    res.status(500).json({ status: "Error", database: "Disconnected", message: error.message });
  }
});

// Database synchronization and server start
const startServer = async () => {
  try {
    await connectDB();
    
    // Ensure database tables exist (Sync models)
    console.log("🔄 Checking database schema...");
    const [tables] = await sequelize.query("SHOW TABLES");
    
    if (tables.length === 0) {
      console.log("🔄 Database is empty. Creating tables...");
      await sequelize.sync();
      console.log("✅ Database schema created successfully");
    } else {
      console.log("✅ Database tables already exist. Skipping creation.");
    }

    // Seed Core Data (Departments, Modules, Assets)
    const { AdminUser, Department, ServiceModule, AssetCategory, MessageTemplate } = require("./models");
    console.log("🌱 Verifying core data (Departments, Modules, Assets)...");
    await Department.seedDefaults();
    await ServiceModule.seedDefaults();
    await AssetCategory.seedDefaults();
    await MessageTemplate.seedDefaults();
    const adminEmail = process.env.ADMIN_EMAIL || "admin@dravanua.com";
    const adminExists = await AdminUser.findOne({ where: { email: adminEmail } });

    if (!adminExists) {
      await AdminUser.create({
        name: process.env.ADMIN_NAME || "Super Admin",
        email: adminEmail,
        password: process.env.ADMIN_PASSWORD || "admin123",
        role: "super_admin",
        isActive: true,
        isEmailConfirmed: true,
      });
      console.log(`✅ Default Super Admin created: ${adminEmail}`);
    }

    app
    .listen(PORT, () => {
      const displayUrl = BASE_URL || `http://localhost:${PORT}`;
      console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
      console.log(`✅ Server is running on port ${PORT}`);
      console.log(`📡 API Base: ${displayUrl}${API_PREFIX}`);
      console.log(`🏥 Health Check: ${displayUrl}${API_PREFIX}/health`);
      console.log(`🔍 DB Check: ${displayUrl}${API_PREFIX}/db-check`);
      console.log(`📖 Documentation: ${displayUrl}/`);
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
        console.error(`   or set a different DRAVANUA_PORT / BACKEND_PORT in your .env`);
      }
      process.exit(1);
    });

  } catch (err) {
    console.error("❌ Database synchronization failed:", err.message);
    console.error("   Ensure your database credentials and connection are correct.");
    process.exit(1);
  }
};

// Global Error Handler
app.use((err, req, res, next) => {
  console.error(`[ERROR] ${err.stack}`);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || "Internal Server Error",
  });
});

startServer();
