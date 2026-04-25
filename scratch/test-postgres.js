const { Sequelize } = require("sequelize");

const testConn = async () => {
  const dialect = "postgres";
  const port = 5432; // The one we found listening
  
  console.log(`Checking connection to ${dialect} on port ${port}...`);
  
  const sequelize = new Sequelize(
    "dravanua_db",
    "postgres", // Try default user
    "password", // Placeholder
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
