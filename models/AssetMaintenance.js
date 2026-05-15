const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AssetMaintenance = sequelize.define("AssetMaintenance", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'maintenance_id'
    },
    assetId: {
      type: DataTypes.UUID,
      field: 'asset_id',
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM('Preventive', 'Corrective', 'Routine'),
      defaultValue: 'Routine',
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    cost: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
    },
    maintenanceDate: {
      type: DataTypes.DATE,
      field: 'maintenance_date',
      allowNull: false,
    },
    provider: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    downtimeDays: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'downtime_days'
    },
    status: {
      type: DataTypes.ENUM('Scheduled', 'In Progress', 'Completed', 'Cancelled'),
      defaultValue: 'Scheduled',
    },
    nextMaintenanceDate: {
      type: DataTypes.DATE,
      field: 'next_maintenance_date',
      allowNull: true,
    },
    recordedBy: {
      type: DataTypes.UUID,
      field: 'recorded_by',
      allowNull: true,
    },
    modifiedBy: {
      type: DataTypes.UUID,
      field: 'modified_by',
      allowNull: true,
    }
  }, {
    tableName: 'asset_maintenance',
    timestamps: true,
    underscored: true
  });

  return AssetMaintenance;
};
