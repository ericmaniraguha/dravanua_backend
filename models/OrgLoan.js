const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const OrgLoan = sequelize.define("OrgLoan",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'loan_id'
    },
    loanName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'loan_name'
    },
    lender: {
      type: DataTypes.STRING,
      allowNull: false
    },
    principalAmount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      field: 'principal_amount'
    },
    interestRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      field: 'interest_rate'
    },
    termMonths: {
      type: DataTypes.INTEGER,
      field: 'term_months'
    },
    remainingBalance: {
      type: DataTypes.DECIMAL(15, 2),
      field: 'remaining_balance'
    },
    startDate: {
      type: DataTypes.DATE,
      field: 'start_date'
    },
    endDate: {
      type: DataTypes.DATE,
      field: 'end_date'
    },
    status: {
      type: DataTypes.ENUM('Active', 'Fully Paid', 'Defaulted'),
      defaultValue: 'Active'
    },
    monthlyInstallment: {
      type: DataTypes.DECIMAL(15, 2),
      field: 'monthly_installment'
    }
  },
  {
    tableName: "org_loans",
    timestamps: true,
    underscored: true
  }
);



  return OrgLoan;
};
