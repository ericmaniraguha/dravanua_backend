const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SalaryAdvance = sequelize.define("SalaryAdvance",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'advance_id'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: { model: 'admin_users', key: 'user_id' }
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    requestDate: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'request_date'
    },
    status: {
      type: DataTypes.ENUM('Pending', 'Approved', 'Paid', 'Rejected', 'Settled'),
      defaultValue: 'Pending'
    },
    paymentDate: {
      type: DataTypes.DATE,
      field: 'payment_date'
    },
    reason: {
      type: DataTypes.TEXT
    },
    transactionId: {
      type: DataTypes.UUID,
      field: 'transaction_id',
      comment: 'Link to finance transaction if paid immediately'
    },
    payrollRecordId: {
      type: DataTypes.UUID,
      field: 'payroll_record_id',
      comment: 'ID of the payroll where this was deducted'
    },
    expectedRepaymentDate: {
      type: DataTypes.DATE,
      field: 'expected_repayment_date'
    },
    repaymentStartDate: {
      type: DataTypes.DATE,
      field: 'repayment_start_date'
    }
  },
  {
    tableName: "salary_advances",
    timestamps: true,
    underscored: true
  }
);



  return SalaryAdvance;
};
