const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Gallery = sequelize.define('Gallery', {
  id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'gallery_id'
    },
  userId: {
      type: DataTypes.UUID,
    field: 'user_id',
    allowNull: true,
    references: { model: 'admin_users', key: 'user_id' }
  },
  departmentId: {
      type: DataTypes.UUID,
    field: 'department_id',
    allowNull: true,
    references: { model: 'departments', key: 'department_id' }
  },
  title: {type: DataTypes.STRING,
      field: "gal_title",
    allowNull: false
  },
  imageUrl: {
    type: DataTypes.STRING,
    field: 'image_url',
    allowNull: false
  },
  category: {type: DataTypes.STRING,
      field: "gal_category",
    allowNull: false
  },
  description: {type: DataTypes.TEXT,
      field: "gal_description",
    allowNull: true
  }
}, {
  tableName: 'gallery',
  timestamps: true,
  underscored: true
});

module.exports = Gallery;
