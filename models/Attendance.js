const { DataTypes, Op } = require('sequelize');
const { sequelize } = require('../config/db');
const isSqlite = sequelize.getDialect() === 'sqlite';

const Attendance = sequelize.define('Attendance', {
  id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'attendance_id'
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
  departmentId: {
    type: DataTypes.UUID,
    field: 'department_id',
    allowNull: true,
    references: { model: 'departments', key: 'department_id' }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false
  },
  clockIn: {
    type: DataTypes.DATE,
    field: 'clock_in',
    allowNull: false
  },
  clockOut: {
    type: DataTypes.DATE,
    field: 'clock_out',
    allowNull: true
  },
  totalHours: {
    type: DataTypes.FLOAT,
    field: 'total_hours',
    allowNull: true
  },
  gpsLat: {
    type: DataTypes.DECIMAL(10, 7),
    field: 'gps_lat',
    allowNull: true
  },
  gpsLon: {
    type: DataTypes.DECIMAL(10, 7),
    field: 'gps_lon',
    allowNull: true
  },
  distanceFromOffice: {
    type: DataTypes.INTEGER,
    field: 'distance_from_office',
    allowNull: true
  },
  gpsAccuracy: {
    type: DataTypes.DECIMAL(6, 2),
    field: 'gps_accuracy',
    allowNull: true
  },
  checkInMethod: {
    type: DataTypes.STRING,
    field: 'check_in_method',
    defaultValue: 'GPS_TERMINAL'
  },
  status: {type: DataTypes.STRING,
      field: "att_status",
    defaultValue: 'on-duty'
  },
  zone: {
    type: DataTypes.STRING,
    allowNull: true
  },
  // Conditional geom for PostGIS (only if not SQLite)
  ...(isSqlite ? {} : {
    geom: {
      type: DataTypes.GEOMETRY('POINT', 4326),
      allowNull: true
    }
  }),
  isVerified: {
    type: DataTypes.BOOLEAN,
    field: 'is_verified',
    defaultValue: false
  },
  verifiedBy: {
    type: DataTypes.UUID,
    field: 'verified_by',
    allowNull: true,
    references: { model: 'admin_users', key: 'user_id' }
  }
}, {
  tableName: 'attendance',
  timestamps: true,
  underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['department_id'] },
      { fields: ['date'] }
    ],
});

module.exports = Attendance;
