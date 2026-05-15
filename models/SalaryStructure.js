const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const SalaryStructure = sequelize.define("SalaryStructure",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'structure_id'
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      field: 'user_id',
      references: { model: 'admin_users', key: 'user_id' }
    },
    baseSalary: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
      defaultValue: 0,
      field: 'base_salary'
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'RWF',
      field: 'currency'
    },
    allowance: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'allowance'
    },
    deductions: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'deductions'
    },
    paymentCycle: {
      type: DataTypes.ENUM('Monthly', 'Weekly', 'Daily', 'Hourly'),
      defaultValue: 'Monthly',
      field: 'payment_cycle'
    },
    bankName: {
      type: DataTypes.STRING,
      field: 'bank_name'
    },
    accountNumber: {
      type: DataTypes.STRING,
      field: 'account_number'
    },
    effectiveDate: {
      type: DataTypes.DATE,
      field: 'effective_date'
    }
  },
  {
    tableName: "salary_structures",
    timestamps: true,
    underscored: true
  }
);



  return SalaryStructure;
};
