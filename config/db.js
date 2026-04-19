const { Sequelize } = require("sequelize");
const path = require("path");
require("dotenv").config();

// Determine dialect from .env or default to sqlite
const dialect = process.env.DB_DIALECT || "sqlite";

let sequelize;

if (dialect === "sqlite") {
  sequelize = new Sequelize({
    dialect: "sqlite",
    storage: path.join(__dirname, "../../database/dravanuahub.sqlite"),
    logging: false,
  });
} else {
  // Use the dialect specified in .env
  sequelize = new Sequelize(
    process.env.DRAVANUA_DB_NAME || "dravanua_db",
    process.env.DRAVANUA_DB_USER || "dravanua_admin",
    process.env.DRAVANUA_DB_PASSWORD || "password",
    {
      host: process.env.DRAVANUA_DB_HOST || "localhost",
      port: process.env.DRAVANUA_DB_PORT || (dialect === "mysql" ? 3306 : 5432),
      dialect: dialect,
      logging: false,
      pool: { max: 5, min: 0, acquire: 30000, idle: 10000 },
    },
  );
}

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(`✅ ${dialect.toUpperCase()} connected successfully`);
  } catch (error) {
    console.error("❌ Database connection failed:", error.message);
    throw error; // Rethrow to let server.js handle the failure
  }
};

module.exports = { sequelize, connectDB };
