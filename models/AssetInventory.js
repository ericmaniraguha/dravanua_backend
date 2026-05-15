const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AssetInventory = sequelize.define("AssetInventory", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'inventory_id'
    },
    assetId: {
      type: DataTypes.UUID,
      field: 'asset_id',
      allowNull: false,
    },
    quantity: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
    },
    reorderLevel: {
      type: DataTypes.DECIMAL(12, 2),
      defaultValue: 0,
      field: 'reorder_level'
    },
    unit: {
      type: DataTypes.STRING,
      defaultValue: 'pcs',
    },
    expiryDate: {
      type: DataTypes.DATEONLY,
      field: 'expiry_date',
      allowNull: true,
    },
    valuation: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
    }
  }, {
    tableName: 'asset_inventory',
    timestamps: true,
    underscored: true
  });

  return AssetInventory;
};
