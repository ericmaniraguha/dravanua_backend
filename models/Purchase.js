const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Purchase = sequelize.define('Purchase', {
  id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'purchase_id'
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
  sn: DataTypes.INTEGER,
  date: {
    type: DataTypes.DATEONLY,
    field: "pur_date"
  },
  description: {

    type: DataTypes.STRING,

    field: "pur_description"

  },
  details: DataTypes.STRING,
  approvedBy: {
    type: DataTypes.STRING,
    field: 'approved_by'
  },
  quantity: DataTypes.INTEGER,
  unitPrice: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'unit_price'
  },
  totalPrice: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'total_price'
  },
  paymentMethod: {
    type: DataTypes.STRING,
    field: 'payment_method'
  },
  paymentAccount: {
    type: DataTypes.STRING,
    field: 'payment_account'
  },
  notes: DataTypes.TEXT,
  createdBy: {
    type: DataTypes.STRING,
    field: 'created_by'
  },
  currency: DataTypes.STRING,
  status: {

    type: DataTypes.STRING,

    field: "pur_status"

  },
}, {
  tableName: 'purchases',
  timestamps: true,
  underscored: true,
    indexes: [
      { fields: ['department_id'] },
      { fields: ['pur_date'] }
    ],
});

module.exports = Purchase;
