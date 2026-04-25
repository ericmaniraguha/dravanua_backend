const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const InventoryMovement = sequelize.define("InventoryMovement", {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
  },
  itemId: {
    type: DataTypes.UUID,
    allowNull: false,
    references: { model: 'items', key: 'id' }
  },
  type: {
    type: DataTypes.ENUM("IN", "OUT"),
    allowNull: false,
  },
  quantity: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
  },
  reason: {
    type: DataTypes.STRING, // e.g., 'Sale', 'Purchase', 'Damage', 'Adjustment'
    allowNull: true,
  },
  referenceId: {
    type: DataTypes.UUID, // Link to Purchase or DailyReport
    allowNull: true,
  },
  date: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },
  recordedBy: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  departmentId: {
    type: DataTypes.UUID,
    field: 'department_id',
    allowNull: true,
    references: { model: 'departments', key: 'department_id' }
  }
}, {
  tableName: "inventory_movements",
  timestamps: true,
});

module.exports = InventoryMovement;
