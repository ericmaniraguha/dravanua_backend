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

// Simple health check
app.get(`${API_PREFIX}/health`, (req, res) => {
  res.status(200).send("system is live");
});

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

  // Connect to Database
  try {
    await connectDB();
  } catch (err) {
    console.error("❌ Fatal Database Error:", err.message);
  }

  // Load Models and Sync Schema
  try {
    require("./models/index");
    if (process.env.NODE_ENV !== "production") {
      await sequelize.sync({ alter: true });
      console.log("✅ All database tables synchronized");
    } else {
      console.log("ℹ️ Production: Schema sync skipped (Managed via migrations)");
    }

    // Auto-provision Super Admin & Departments
    const { AdminUser, Department } = require("./models/index");
    await Department.seedDefaults();

    const adminEmail = process.env.ADMIN_EMAIL || "admin@dravanua.com";
    const adminPassword = process.env.ADMIN_PASSWORD;
    const adminName = process.env.ADMIN_NAME || "Super Admin";

    const existingAdmin = await AdminUser.findOne({
      where: { email: adminEmail },
    });

    if (!existingAdmin && adminPassword) {
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
      console.log(`👤 Super Admin provisioned: ${adminEmail} (${adminName})`);
    } else if (!existingAdmin && !adminPassword) {
      console.warn(
        "⚠️  No Super Admin found and ADMIN_PASSWORD is not set in .env",
      );
    }
  } catch (syncError) {
    console.error(
      "⚠️ Database synchronization/provisioning failed:",
      syncError.message,
    );
  }

  // Verify SMTP email connection
  try {
    await verifyEmailConnection();
  } catch (emailError) {
    console.error("⚠️ Email service connection failed:", emailError.message);
  }

  // Start listening
  const HOST =
    process.env.DRAVANUA_HOST || process.env.DEFAULT_HOST || "localhost";
  const PROTOCOL = process.env.PROTOCOL || "http";

  app.listen(PORT, () => {
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log(`🚀 Server running on ${PROTOCOL}://${HOST}:${PORT}`);
    console.log(`📡 API Base: ${PROTOCOL}://${HOST}:${PORT}${API_PREFIX}`);
    console.log(`📋 Health Check: ${PROTOCOL}://${HOST}:${PORT}/`);
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  });
};

startServer();
