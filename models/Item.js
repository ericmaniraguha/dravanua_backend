const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Item = sequelize.define("Item", {
    id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  
    },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  type: {
    type: DataTypes.STRING, // e.g., 'Service', 'Product', 'Equipment'
    allowNull: true,
  },
  quality: {
    type: DataTypes.STRING, // e.g., 'A+', 'Standard', 'Premium'
    allowNull: true,
  },
  price: {
    type: DataTypes.DECIMAL(15, 2),
    allowNull: false,
    defaultValue: 0,
  },
  departmentId: {
    type: DataTypes.UUID,
    allowNull: true,
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
  },
  currentStock: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  minStock: {
    type: DataTypes.DECIMAL(12, 2),
    defaultValue: 0,
  },
  unit: {
    type: DataTypes.STRING,
    defaultValue: 'pcs', // Default to pieces
  },
  itemCode: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true,
    field: 'item_code'
  },
  brand: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  model: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  supplier: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'Active'
  }
}, {
  tableName: 'items',
  timestamps: true,
});



  return Item;
};
