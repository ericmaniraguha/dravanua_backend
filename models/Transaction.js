const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Transaction = sequelize.define("Transaction",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'transaction_id'
    },
    userId: {
      type: DataTypes.UUID,
      field: "user_id",
      allowNull: true,
      references: { model: 'admin_users', key: 'user_id' },
      comment: "ID of the admin who recorded this transaction"
    },
    departmentId: {
      type: DataTypes.UUID,
      field: "department_id",
      allowNull: true,
      references: { model: 'departments', key: 'department_id' }
    },
    type: {
      type: DataTypes.ENUM("Revenue", "Expense", "Asset", "Liability", "Equity"),
      allowNull: false,
    },
    amount: {type: DataTypes.DECIMAL(12, 2),
      field: "txn_amount",
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(10),
      allowNull: false,
      defaultValue: "RWF",
    },
    category: {
      type: DataTypes.STRING,
      field: "txn_category",
      allowNull: false,
      comment: 'Financial category or department name'
    },
    date: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    description: {type: DataTypes.STRING,
      field: "txn_description",
      allowNull: true,
    },
    paymentMethod: {
      type: DataTypes.STRING(32),
      field: "payment_method",
      allowNull: true,
      defaultValue: "Cash",
    },
    financialInstitution: {
      type: DataTypes.STRING,
      field: "financial_institution",
      allowNull: true,
      comment: "Bank name or Telecom company (MTN, Airtel, etc.)"
    },
    accountNumber: {
      type: DataTypes.STRING,
      field: "account_number",
      allowNull: true,
    },
    client: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    recordedBy: {
      type: DataTypes.STRING,
      field: "recorded_by",
      allowNull: true,
      comment: "Legacy string field for recordedBy name"
    },
  },
  {
    tableName: "transactions",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['user_id'] },
      { fields: ['department_id'] },
      { fields: ['date'] },
      { fields: ['txn_category'] }
    ],
  },
);



  return Transaction;
};
