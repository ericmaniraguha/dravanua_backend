const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const PayrollRecord = sequelize.define(
  "PayrollRecord",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'payroll_id'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: { model: 'admin_users', key: 'user_id' }
    },
    month: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    year: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    baseAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'base_amount'
    },
    allowances: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    deductions: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    netAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'net_amount'
    },
    daysWorked: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: 'days_worked',
      comment: 'Count of verified attendance days for this period'
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Approved', 'Paid', 'Cancelled'),
      defaultValue: 'Pending'
    },
    paymentDate: {
      type: DataTypes.DATE,
      field: 'payment_date'
    },
    transactionId: {
      type: DataTypes.UUID,
      field: 'transaction_id',
      comment: 'Link to the finance transaction log once paid'
    },
    notes: {
      type: DataTypes.TEXT
    }
  },
  {
    tableName: "payroll_records",
    timestamps: true,
    underscored: true,
    hooks: {
      beforeSave: async (record) => {
        try {
          // Automatic Net Amount Calculation
          const base = parseFloat(record.baseAmount || 0);
          const allow = parseFloat(record.allowances || 0);
          const deduct = parseFloat(record.deductions || 0);
          
          record.netAmount = base + allow - deduct;

          if (record.netAmount < 0) {
            throw new Error("Net amount cannot be negative. Check base/allowance/deduction values.");
          }
        } catch (error) {
          console.error("❌ PayrollRecord lifecycle error:", error.message);
          throw error;
        }
      }
    }
  }
);

module.exports = PayrollRecord;
