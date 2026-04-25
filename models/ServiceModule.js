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

/**
 * Seed the standard service modules if empty.
 */
ServiceModule.seedDefaults = async function () {
  try {
    const modules = [
      {
        slug: "studio",
        name: "Studio Photography",
        description: "Professional photo sessions, portraiture, and creative media production.",
      },
      {
        slug: "stationery",
        name: "Stationery & Office Supplies",
        description: "Official Stationery & Office Supplies and premium office materials for corporate and individual needs.",
      },
      {
        slug: "flower-gifts",
        name: "Flower Gifts & Decoration",
        description: "Artisanal floral arrangements and premium gift decoration services.",
      },
      {
        slug: "classic-fashion",
        name: "Classic Fashion Styling",
        description: "High-end fashion coordination and event styling services.",
      },
    ];

    for (const mod of modules) {
      await ServiceModule.findOrCreate({
        where: { slug: mod.slug },
        defaults: mod
      });
    }
    console.log("✅ Service Modules seeded successfully");
  } catch (error) {
    console.error("❌ Failed to seed Service Modules:", error.message);
  }
};

module.exports = ServiceModule;
