const { Sequelize } = require("sequelize");
const path = require("path");
require("dotenv").config();

// ========== ENVIRONMENT VALIDATION ==========
// Validate required environment variables before attempting connection
const validateEnvironment = () => {
  const dialect = process.env.DB_DIALECT || "sqlite";

  if (dialect !== "sqlite") {
    const requiredVars = [
      "DRAVANUA_DB_NAME",
      "DRAVANUA_DB_USER",
      "DRAVANUA_DB_PASSWORD",
      "DRAVANUA_DB_HOST",
    ];

    const missingVars = requiredVars.filter((varName) => !process.env[varName]);

    if (missingVars.length > 0) {
      throw new Error(
        `Missing required environment variables for ${dialect.toUpperCase()}:\n` +
          missingVars.map((v) => `  • ${v}`).join("\n") +
          "\n\nPlease check your .env file and ensure all required variables are set.",
      );
    }
  }
};

// Validate before initializing Sequelize
try {
  validateEnvironment();
} catch (err) {
  console.error("❌ Environment Validation Failed:");
  console.error(err.message);
  process.exit(1);
}

// ========== DIALECT DETECTION ==========
const dialect = process.env.DB_DIALECT || "sqlite";

let sequelize;

// ========== SQLITE CONFIGURATION ==========
if (dialect === "sqlite") {
  console.log("📦 Using SQLite database");
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: path.join(__dirname, "../../database/dravanuahub.sqlite"),
    logging: false,
    define: {
      timestamps: true,
      underscored: true,
    },
  });
}

// ========== MYSQL CONFIGURATION ==========
else if (dialect === "mysql" || dialect === "mariadb") {
  const dbName = dialect === "mariadb" ? "MariaDB" : "MySQL";
  console.log(`📦 Using ${dbName} database`);
  sequelize = new Sequelize(
    process.env.DRAVANUA_DB_NAME,
    process.env.DRAVANUA_DB_USER,
    process.env.DRAVANUA_DB_PASSWORD,
    {
      host: process.env.DRAVANUA_DB_HOST,
      port: process.env.DRAVANUA_DB_PORT,
      dialect: dialect,
      logging: false,

      // Connection pooling for better performance
      pool: {
        max: 5, // Maximum connections in pool
        min: 0, // Minimum connections in pool
        acquire: 30000, // Time (ms) to acquire a connection before timeout
        idle: 10000, // Time (ms) before idle connection is released
      },

      // MySQL/MariaDB-specific dialect options
      dialectOptions: {
        charset: "utf8mb4", // Full Unicode support (emojis, special chars)
        supportBigNumbers: true, // Support for BIGINT
        bigNumberStrings: true, // Return BIGINT as strings
        decimalNumbers: true, // Return DECIMAL as numbers instead of strings
        connectTimeout: 10000, // 10 seconds to establish connection
      },

      // Model defaults
      define: {
        charset: "utf8mb4",
        collate: "utf8mb4_unicode_ci",
        timestamps: true,
        underscored: true,
      },
    },
  );
}

// ========== UNSUPPORTED DIALECT ==========
else {
  throw new Error(
    `Unsupported database dialect: ${dialect}\n` +
      "Supported dialects: sqlite, mysql, mariadb, postgres",
  );
}

// ========== CONNECTION HANDLER ==========
const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ ${dialect.toUpperCase()} connected successfully`);

    // Log additional connection info (not in production for security)
    if (dialect !== "sqlite" && process.env.NODE_ENV !== "production") {
      console.log(
        `   Host: ${process.env.DRAVANUA_DB_HOST}:${
          process.env.DRAVANUA_DB_PORT || "Default Dialect Port"
        }`,
      );
      console.log(`   Database: ${process.env.DRAVANUA_DB_NAME}`);
      if (dialect === "mysql" || dialect === "mariadb") {
        console.log(`   Charset: utf8mb4`);
      }
    }
  } catch (error) {
    console.error(
      `❌ ${dialect.toUpperCase()} connection failed:`,
      error.message,
    );

    // Provide helpful error messages for common issues
    if (dialect === "mysql" || dialect === "mariadb") {
      if (error.message.includes("PROTOCOL_CONNECTION_LOST")) {
        console.error(
          "   → Connection was lost. Check if MySQL/MariaDB is running.",
        );
      } else if (error.message.includes("ER_ACCESS_DENIED")) {
        console.error(
          "   → Access denied. Check your DRAVANUA_DB_USER and DRAVANUA_DB_PASSWORD.",
        );
      } else if (error.message.includes("ER_BAD_DB_ERROR")) {
        console.error(
          "   → Database does not exist. Check DRAVANUA_DB_NAME or create the database.",
        );
      } else if (error.message.includes("getaddrinfo")) {
        console.error(
          "   → Cannot reach host. Check DRAVANUA_DB_HOST and network connectivity.",
        );
      } else if (error.message.includes("ECONNREFUSED")) {
        console.error(
          "   → Connection refused. Check DRAVANUA_DB_HOST and DRAVANUA_DB_PORT.",
        );
      }
    }

    throw error; // Rethrow to let server.js handle the failure
  }
};

// ========== EXPORT ==========
module.exports = { sequelize, connectDB, dialect };
