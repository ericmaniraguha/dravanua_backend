const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const isSqlite = sequelize.getDialect() === 'sqlite';

const Violation = sequelize.define('Violation', {
  id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'violation_id'
    },
  userId: {
      type: DataTypes.UUID,
    field: 'user_id',
    allowNull: false
  },
  userName: {
    type: DataTypes.STRING,
    field: 'user_name',
    allowNull: false
  },
  violationType: {
    type: DataTypes.STRING,
    field: 'violation_type',
    allowNull: false
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  timestamp: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  gpsLat: {
     type: DataTypes.DECIMAL(10, 7),
     field: 'gps_lat'
  },
  gpsLon: {
     type: DataTypes.DECIMAL(10, 7),
     field: 'gps_lon'
  },
  distanceFromOffice: {
     type: DataTypes.INTEGER,
     field: 'distance_from_office'
  },
  attemptedAction: {
     type: DataTypes.STRING,
     field: 'attempted_action'
  },
  rejectionReason: {
     type: DataTypes.STRING,
     field: 'rejection_reason'
  },
  ipAddress: {
     type: DataTypes.STRING,
     field: 'ip_address'
  },
  deviceInfo: {
     type: DataTypes.STRING,
     field: 'device_info'
  },
  // Conditional geom — MySQL/MariaDB spatial support only (not supported by SQLite)
  ...(isSqlite ? {} : {
    geom: {
      type: DataTypes.GEOMETRY('POINT'),
      allowNull: true
    }
  })
}, {
  tableName: 'attendance_violations',
  timestamps: true,
  underscored: true,
  updatedAt: false
});

module.exports = Violation;
