const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Subscription = sequelize.define('Subscription', {
  id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'subscription_id'
    },
  name: {type: DataTypes.STRING,
      field: "sub_name",
    allowNull: false
  },
  category: {type: DataTypes.STRING,
      field: "sub_category",
    allowNull: false,
    defaultValue: 'General'
  },
  plan: {
    type: DataTypes.STRING,
    allowNull: true
  },
  billingCycle: {
    type: DataTypes.STRING,
    field: 'billing_cycle',
    allowNull: false,
    defaultValue: 'Monthly',
    validate: {
      isIn: [['Weekly', 'Monthly', 'Quarterly', 'Yearly']]
    }
  },
  cost: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: false,
    defaultValue: 0
  },
  currency: {
    type: DataTypes.STRING(6),
    allowNull: false,
    defaultValue: 'RWF'
  },
  paymentMethod: {
    type: DataTypes.STRING,
    field: 'payment_method',
    allowNull: true
  },
  accountSource: {
    type: DataTypes.STRING,
    field: 'account_source',
    allowNull: true
  },
  startDate: {
    type: DataTypes.DATEONLY,
    field: 'start_date',
    allowNull: false
  },
  nextBillingDate: {
    type: DataTypes.DATEONLY,
    field: 'next_billing_date',
    allowNull: false
  },
  autoRenewal: {
    type: DataTypes.BOOLEAN,
    field: 'auto_renewal',
    defaultValue: true
  },
  status: {type: DataTypes.STRING,
      field: "sub_status",
    allowNull: false,
    defaultValue: 'Active',
    validate: {
      isIn: [['Active', 'Paused', 'Cancelled', 'Expired']]
    }
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  alertDaysBefore: {
    type: DataTypes.INTEGER,
    field: 'alert_days_before',
    defaultValue: 3
  },
  alertSent: {
    type: DataTypes.BOOLEAN,
    field: 'alert_sent',
    defaultValue: false
  },
  userId: {
      type: DataTypes.UUID,
    field: 'user_id',
    allowNull: true
  },
  departmentId: {
      type: DataTypes.UUID,
    field: 'department_id',
    allowNull: true
  }
}, {
  tableName: 'subscriptions',
  timestamps: true,
  underscored: true
});

module.exports = Subscription;
