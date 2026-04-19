require('dotenv').config();

module.exports = {
  development: {
    username: process.env.DRAVANUA_DB_USER,
    password: process.env.DRAVANUA_DB_PASSWORD,
    database: process.env.DRAVANUA_DB_NAME,
    host: process.env.DRAVANUA_DB_HOST,
    port: process.env.DRAVANUA_DB_PORT,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false
  },
  test: {
    username: process.env.DRAVANUA_DB_USER,
    password: process.env.DRAVANUA_DB_PASSWORD,
    database: process.env.DRAVANUA_DB_NAME_TEST || 'dravanua_test',
    host: process.env.DRAVANUA_DB_HOST,
    port: process.env.DRAVANUA_DB_PORT,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false
  },
  production: {
    username: process.env.DRAVANUA_DB_USER,
    password: process.env.DRAVANUA_DB_PASSWORD,
    database: process.env.DRAVANUA_DB_NAME,
    host: process.env.DRAVANUA_DB_HOST,
    port: process.env.DRAVANUA_DB_PORT,
    dialect: process.env.DB_DIALECT || 'mysql',
    logging: false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
};
