const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const OrgFinanceLog = sequelize.define("OrgFinanceLog",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'log_id'
    },
    type: {
      type: DataTypes.ENUM('Loan Repayment', 'Savings Deposit', 'Savings Withdrawal'),
      allowNull: false
    },
    loanId: {
      type: DataTypes.UUID,
      field: 'loan_id',
      references: { model: 'org_loans', key: 'loan_id' }
    },
    savingsId: {
      type: DataTypes.UUID,
      field: 'savings_id',
      references: { model: 'org_savings', key: 'savings_id' }
    },
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    description: {
      type: DataTypes.STRING
    },
    transactionId: {
      type: DataTypes.UUID,
      field: 'transaction_id',
      comment: 'Corresponding entry in the main financial ledger'
    }
  },
  {
    tableName: "org_finance_logs",
    timestamps: true,
    underscored: true
  }
);



  return OrgFinanceLog;
};
