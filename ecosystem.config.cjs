require('dotenv').config();

module.exports = {
  apps: [
    {
      name: "dravanua-hub-backend",
      script: "./server.js",
      instances: "max",
      exec_mode: "cluster",
      env: {
        NODE_ENV: process.env.NODE_ENV || "production",
        DRAVANUA_PORT: process.env.DRAVANUA_PORT || 8003
      },
      env_production: {
        NODE_ENV: "production",
      },
      log_date_format: "YYYY-MM-DD HH:mm Z",
      error_file: "./logs/error.log",
      out_file: "./logs/out.log",
      merge_logs: true,
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
    },
  ],
};
