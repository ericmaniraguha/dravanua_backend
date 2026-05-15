const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AssetTransfer = sequelize.define("AssetTransfer", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'transfer_id'
    },
    assetId: {
      type: DataTypes.UUID,
      field: 'asset_id',
      allowNull: false,
    },
    fromDepartmentId: {
      type: DataTypes.UUID,
      field: 'from_department_id',
      allowNull: false,
    },
    toDepartmentId: {
      type: DataTypes.UUID,
      field: 'to_department_id',
      allowNull: false,
    },
    transferDate: {
      type: DataTypes.DATE,
      field: 'transfer_date',
      defaultValue: DataTypes.NOW,
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Approved', 'Rejected', 'Completed'),
      defaultValue: 'Pending',
    },
    requestedBy: {
      type: DataTypes.UUID,
      field: 'requested_by',
      allowNull: false,
    },
    approvedBy: {
      type: DataTypes.UUID,
      field: 'approved_by',
      allowNull: true,
    },
    reason: {
      type: DataTypes.TEXT,
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
    tableName: 'asset_transfers',
    timestamps: true,
    underscored: true
  });

  return AssetTransfer;
};
