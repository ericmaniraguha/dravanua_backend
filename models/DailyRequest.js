const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const DailyRequest = sequelize.define('DailyRequest', {
  id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'request_id'
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
  date: DataTypes.DATEONLY,
  itemNeeded: {
    type: DataTypes.STRING,
    field: 'item_needed',
    allowNull: false
  },
  personRequested: {
    type: DataTypes.STRING,
    field: 'person_requested'
  },
  status: {type: DataTypes.ENUM('pending', 'approved', 'rejected'),
      field: "req_status",
    defaultValue: 'pending'
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
  paymentMethod: {
    type: DataTypes.STRING,
    field: 'payment_method'
  },
  paymentAccount: {
    type: DataTypes.STRING,
    field: 'payment_account'
  },
  notes: DataTypes.TEXT
}, {
  tableName: 'daily_requests',
  timestamps: true,
  underscored: true
});

module.exports = DailyRequest;
