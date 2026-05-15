const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AssetCategory = sequelize.define("AssetCategory", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'category_id'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    departmentId: {
      type: DataTypes.UUID,
      field: 'department_id',
      allowNull: true, // If null, it's a global category
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'asset_categories',
    timestamps: true,
    underscored: true
  });

  AssetCategory.seedDefaults = async function () {
    try {
      const { Department } = require("./index");
      const studioId = await Department.resolveId("studio");
      const papeterieId = await Department.resolveId("papeterie");
      const fashionId = await Department.resolveId("classic_fashion");

      const defaults = [
        { name: "Cameras", departmentId: studioId },
        { name: "PTZ Cameras", departmentId: studioId },
        { name: "Studio Lights", departmentId: studioId },
        { name: "Printers", departmentId: papeterieId },
        { name: "Computers & Laptops", departmentId: null }, // Global
        { name: "Fingerprint Devices", departmentId: null }, // Global
        { name: "Sewing Machines", departmentId: fashionId },
        { name: "Tools & Equipment", departmentId: null },
        { name: "Vehicles", departmentId: null },
        { name: "Office Furniture", departmentId: null },
        { name: "Others", departmentId: null }
      ];

      for (const item of defaults) {
        await AssetCategory.findOrCreate({
          where: { name: item.name },
          defaults: item,
        });
      }
      console.log("✅ Default asset categories synced/seeded");
    } catch (error) {
      console.error("❌ Failed to seed default asset categories:", error.message);
    }
  };

  return AssetCategory;
};
