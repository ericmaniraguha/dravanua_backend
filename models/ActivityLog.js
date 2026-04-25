const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const ActivityLog = sequelize.define("ActivityLog",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'log_id'
    },
    userId: {
      type: DataTypes.UUID,
      field: "user_id",
      allowNull: false,
      references: { model: 'admin_users', key: 'user_id' },
    },
    userName: {
      type: DataTypes.STRING,
      field: "user_name",
      allowNull: false,
    },
    departmentId: {
      type: DataTypes.UUID,
      field: "department_id",
      allowNull: true,
      references: { model: 'departments', key: 'department_id' },
    },
    action: {
      type: DataTypes.STRING,
      field: "log_action",
      allowNull: false,
    },
    module: {
      type: DataTypes.STRING,
      field: "log_module",
      allowNull: false,
    },
    details: {
      type: DataTypes.TEXT,
      field: "log_details",
      allowNull: true,
    },
  },
  {
    tableName: "activity_logs",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['log_module'] },
      { fields: ['created_at'] }
    ],
  },
);



  return ActivityLog;
};
