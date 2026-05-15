const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AssetAssignment = sequelize.define("AssetAssignment", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'assignment_id'
    },
    assetId: {
      type: DataTypes.UUID,
      field: 'asset_id',
      allowNull: false,
    },
    employeeId: {
      type: DataTypes.UUID,
      field: 'employee_id',
      allowNull: false,
    },
    assignedAt: {
      type: DataTypes.DATE,
      field: 'assigned_at',
      defaultValue: DataTypes.NOW,
    },
    returnedAt: {
      type: DataTypes.DATE,
      field: 'returned_at',
      allowNull: true,
    },
    conditionOnAssignment: {
      type: DataTypes.STRING,
      field: 'condition_on_assignment',
      allowNull: true,
    },
    conditionOnReturn: {
      type: DataTypes.STRING,
      field: 'condition_on_return',
      allowNull: true,
    },
    digitalSignature: {
      type: DataTypes.TEXT, // Base64 signature or URL
      field: 'digital_signature',
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Active', 'Returned', 'Overdue'),
      defaultValue: 'Active',
    }
  }, {
    tableName: 'asset_assignments',
    timestamps: true,
    underscored: true
  });

  return AssetAssignment;
};
