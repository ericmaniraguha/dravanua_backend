const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ServiceModule = sequelize.define('ServiceModule', {
  id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'module_id'
    },
  name: {type: DataTypes.STRING,
      field: "sm_name",
    allowNull: false
  },
  slug: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: true
  },
  description: {type: DataTypes.TEXT,
      field: "sm_description",
    allowNull: true
  },
  icon: {
    type: DataTypes.STRING,
    allowNull: true
  },
  route: {
    type: DataTypes.STRING,
    allowNull: true
  },
  hub_lat: {
     type: DataTypes.DECIMAL(10, 7),
     allowNull: true
  },
  hub_lon: {
     type: DataTypes.DECIMAL(10, 7),
     allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    field: 'is_active',
    defaultValue: true
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    field: 'display_order',
    defaultValue: 0
  }
}, {
  tableName: 'service_modules',
  timestamps: true,
  underscored: true
});

module.exports = ServiceModule;
