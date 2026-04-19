const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const isPostgres = sequelize.getDialect() === 'postgres';

const fields = {
  id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'office_id'
    },
  office_name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: false
  },
  allowed_radius: {
    type: DataTypes.INTEGER,
    defaultValue: 100
  },
  buffer_radius: {
    type: DataTypes.INTEGER,
    defaultValue: 150
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  address: DataTypes.STRING,
  city: DataTypes.STRING,
  country: DataTypes.STRING
};

// On PostgreSQL, add a native geography column for spatial indexing
if (isPostgres) {
  fields.geom = {
    type: DataTypes.GEOMETRY('POINT', 4326),
    allowNull: true
  };
}

const OfficeLocation = sequelize.define('OfficeLocation', fields, {
  tableName: 'office_locations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  indexes: [
    { 
      fields: ['geom'],
      using: 'GIST'
    }
  ],
  hooks: {
    // Auto-populate geom from latitude/longitude before insert (PostgreSQL only)
    beforeCreate: (record) => {
      if (isPostgres && record.latitude != null && record.longitude != null) {
        record.geom = {
          type: 'Point',
          coordinates: [parseFloat(record.longitude), parseFloat(record.latitude)],
          crs: { type: 'name', properties: { name: 'EPSG:4326' } }
        };
      }
    },
    beforeUpdate: (record) => {
      if (isPostgres && (record.changed('latitude') || record.changed('longitude'))) {
        record.geom = {
          type: 'Point',
          coordinates: [parseFloat(record.longitude), parseFloat(record.latitude)],
          crs: { type: 'name', properties: { name: 'EPSG:4326' } }
        };
      }
    }
  }
});

module.exports = OfficeLocation;
