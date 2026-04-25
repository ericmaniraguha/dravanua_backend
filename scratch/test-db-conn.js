const { Sequelize } = require("sequelize");
require("dotenv").config();

const testConn = async () => {
  const dialect = process.env.DB_DIALECT || "mysql";
  const port = process.env.DRAVANUA_DB_PORT || (dialect === "mysql" ? 3306 : 5432);
  
  console.log(`Checking connection to ${dialect} on port ${port}...`);
  
  const sequelize = new Sequelize(
    process.env.DRAVANUA_DB_NAME || "dravanua_db",
    process.env.DRAVANUA_DB_USER || "dravanua_admin",
    process.env.DRAVANUA_DB_PASSWORD || "password",
    {
      host: process.env.DRAVANUA_DB_HOST || "localhost",
      port: port,
      dialect: dialect,
      logging: console.log,
    }
  );

  try {
    await sequelize.authenticate();
    console.log("✅ Connection successful!");
  } catch (error) {
    console.error("❌ Connection failed:", error.message);
  } finally {
    await sequelize.close();
  }
};

testConn();
