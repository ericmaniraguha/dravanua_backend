const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Asset = sequelize.define("Asset", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'asset_id'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    assetCode: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
      field: 'asset_code'
    },
    barcode: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    rfid: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: true,
    },
    brand: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    model: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    serialNumber: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'serial_number'
    },
    purchaseDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'purchase_date'
    },
    purchaseCost: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'purchase_cost'
    },
    warrantyExpiry: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      field: 'warranty_expiry'
    },
    warrantyDetails: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'warranty_details'
    },
    vendor: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM('Active', 'In Use', 'Available', 'Under Maintenance', 'Damaged', 'Lost', 'Disposed', 'Archived'),
      defaultValue: 'Available',
    },
    condition: {
      type: DataTypes.STRING, // e.g., 'New', 'Good', 'Fair', 'Poor'
      allowNull: true,
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    imageUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'image_url'
    },
    attachments: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    categoryId: {
      type: DataTypes.UUID,
      field: 'category_id',
      allowNull: false,
    },
    departmentId: {
      type: DataTypes.UUID,
      field: 'department_id',
      allowNull: false,
    },
    assignedTo: {
      type: DataTypes.UUID,
      field: 'assigned_to',
      allowNull: true,
    },
    customAssignee: {
      type: DataTypes.STRING,
      field: 'custom_assignee',
      allowNull: true,
    },
    isConsumable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_consumable'
    },
    isRentable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'is_rentable'
    },
    rentalRate: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'rental_rate'
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
    tableName: 'assets',
    timestamps: true,
    underscored: true
  });

  return Asset;
};
