const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const LocationHistory = sequelize.define('LocationHistory', {
  id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'location_id'
    },
  userId: {
      type: DataTypes.UUID,
    field: 'user_id',
    allowNull: false
  },
  attendanceId: {
      type: DataTypes.UUID,
    field: 'attendance_id'
  },
  gpsLat: {
     type: DataTypes.DECIMAL(10, 7),
     field: 'gps_lat',
     allowNull: false
  },
  gpsLon: {
     type: DataTypes.DECIMAL(10, 7),
     field: 'gps_lon',
     allowNull: false
  },
  accuracy: DataTypes.DECIMAL(6, 2),
  altitude: DataTypes.DECIMAL(8, 2),
  speed: DataTypes.DECIMAL(6, 2),
  heading: DataTypes.DECIMAL(5, 2),
  distanceFromOffice: {
     type: DataTypes.INTEGER,
     field: 'distance_from_office'
  },
  recordedAt: {
    type: DataTypes.DATE,
    field: 'recorded_at',
    defaultValue: DataTypes.NOW
  },
  actionType: {
     type: DataTypes.STRING,
     field: 'action_type'
  },
  geom: {
    type: DataTypes.GEOMETRY('POINT', 4326),
    allowNull: true
  }
}, {
  tableName: 'gps_location_history',
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['attendance_id'] },
    { fields: ['recorded_at'] },
    { 
      fields: ['geom'],
      using: 'GIST'
    }
  ]
});

module.exports = LocationHistory;
