const { Sequelize } = require("sequelize");
require("dotenv").config();

const testConn = async () => {
  const dialect = "postgres";
  const port = 5432;
  
  console.log(`Checking connection to ${dialect} on port ${port} using .env credentials...`);
  
  const sequelize = new Sequelize(
    process.env.DRAVANUA_DB_NAME,
    process.env.DRAVANUA_DB_USER,
    process.env.DRAVANUA_DB_PASSWORD,
    {
      host: "localhost",
      port: port,
      dialect: dialect,
      logging: false,
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
