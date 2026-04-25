const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const isSqlite = sequelize.getDialect() === 'sqlite';
  const LocationHistory = sequelize.define("LocationHistory", {
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
  // Conditional geom — MySQL/MariaDB spatial support only (not supported by SQLite)
  ...(isSqlite ? {} : {
    geom: {
      type: DataTypes.GEOMETRY('POINT'),
      allowNull: true
    }
  })
}, {
  tableName: 'gps_location_history',
  timestamps: false,
  underscored: true,
  indexes: [
    { fields: ['user_id'] },
    { fields: ['attendance_id'] },
    { fields: ['recorded_at'] }
    // NOTE: SPATIAL INDEX on geom is created separately via afterSync hook
    // MySQL does not support 'USING SPATIAL' in Sequelize's ADD INDEX syntax
  ],
  hooks: {
    afterSync: async () => {
      if (isSqlite) return; // SPATIAL INDEX not supported in SQLite
      try {
        const [rows] = await sequelize.query(
          `SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
           WHERE TABLE_SCHEMA = DATABASE()
           AND TABLE_NAME = 'gps_location_history'
           AND INDEX_NAME = 'idx_location_geom'`
        );
        if (rows.length === 0) {
          await sequelize.query(
            'CREATE SPATIAL INDEX idx_location_geom ON gps_location_history (geom)'
          );
        }
      } catch (e) {
        // Ignore — index may fail if geom column has NULLs; harmless
      }
    }
  }
});



  return LocationHistory;
};
