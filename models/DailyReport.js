const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DailyReport = sequelize.define('DailyReport', {
  id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'report_id'
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
  paymentMethod: {
    type: DataTypes.STRING,
    field: 'payment_method'
  },
  paymentAccount: {
    type: DataTypes.STRING,
    field: 'payment_account'
  },
  notes: DataTypes.TEXT,
  sin: DataTypes.STRING,
  date: {
    type: DataTypes.DATEONLY,
    field: "dr_date"
  },
  service: DataTypes.STRING,
  quantity: DataTypes.INTEGER,
  unitPrice: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'unit_price'
  },
  totalPrice: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'total_price'
  },
  amountPaid: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'amount_paid'
  },
  debt: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'debt'
  },
  timeToPay: {
    type: DataTypes.STRING,
    field: 'time_to_pay'
  },
  isPaid: {
    type: DataTypes.BOOLEAN,
    field: 'is_paid'
  },
  contactPerson: {
    type: DataTypes.STRING,
    field: 'contact_person'
  },
  telephone: DataTypes.STRING,
  createdBy: {
    type: DataTypes.STRING,
    field: 'created_by'
  },
  currency: DataTypes.STRING
}, {
  tableName: 'daily_reports',
  timestamps: true,
  underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['department_id'] },
      { fields: ['dr_date'] }
    ],
});

module.exports = DailyReport;
