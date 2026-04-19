const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Expense = sequelize.define('Expense', {
  id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'expense_id'
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
    field: "exp_date"
  },
  description: {

    type: DataTypes.STRING,

    field: "exp_description"

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
  createdBy: {
    type: DataTypes.STRING,
    field: 'created_by'
  },
  currency: DataTypes.STRING,
  paymentMethod: {
    type: DataTypes.STRING,
    field: 'payment_method'
  },
  paymentAccount: {
    type: DataTypes.STRING,
    field: 'payment_account'
  },
  notes: DataTypes.TEXT,
  status: {

    type: DataTypes.STRING,

    field: "exp_status"

  },
}, {
  tableName: 'expenses',
  timestamps: true,
  underscored: true,
    indexes: [
      { fields: ['department_id'] },
      { fields: ['exp_date'] }
    ],
});

module.exports = Expense;
