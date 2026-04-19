const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Reminder = sequelize.define('Reminder', {
  id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'reminder_id'
    },
  title: {type: DataTypes.STRING(255),
      field: "rem_title",
    allowNull: false,
    validate: { notEmpty: true }
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  category: {type: DataTypes.STRING(100),
      field: "rem_category",
    allowNull: false,
    defaultValue: 'General',
    validate: {
      isIn: [['Payment', 'Meeting', 'Subscription', 'Project', 'Work Coordination', 'Follow-up', 'Compliance', 'HR', 'Finance', 'General', 'Other', 'Salary', 'Loan', 'Savings']]
    }
  },
  priority: {
    type: DataTypes.STRING(20),
    allowNull: false,
    defaultValue: 'Medium',
    validate: {
      isIn: [['Low', 'Medium', 'High', 'Urgent']]
    }
  },
  department: {
    type: DataTypes.STRING(150),
    allowNull: true
  },
  sendToAll: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'send_to_all'
  },
  recipient: {
    type: DataTypes.STRING(255),
    allowNull: true
  },
  reminderDate: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    field: 'reminder_date'
  },
  reminderTime: {
    type: DataTypes.TIME,
    allowNull: true,
    field: 'reminder_time'
  },
  dueDate: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'due_date'
  },
  status: {type: DataTypes.STRING(20),
      field: "rem_status",
    allowNull: false,
    defaultValue: 'Pending',
    validate: {
      isIn: [['Pending', 'Sent', 'Completed', 'Cancelled']]
    }
  },
  createdBy: {
    type: DataTypes.STRING(200),
    allowNull: true,
    field: 'created_by'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  emailSent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'email_sent'
  },
  user_id: {
    type: DataTypes.UUID,
    allowNull: true
  },
  department_id: {
      type: DataTypes.UUID,
    allowNull: true
  }
}, {
  tableName: 'reminders',
  underscored: true,
  timestamps: true
});

module.exports = Reminder;
