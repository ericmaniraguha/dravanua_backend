const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const OrgSavings = sequelize.define(
  "OrgSavings",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'savings_id'
    },
    accountName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'account_name'
    },
    bankName: {
      type: DataTypes.STRING,
      field: 'bank_name'
    },
    accountNumber: {
      type: DataTypes.STRING,
      field: 'account_number'
    },
    currentBalance: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0,
      field: 'current_balance'
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'RWF'
    },
    purpose: {
      type: DataTypes.STRING,
      comment: 'Maintenance, Reserve, Expansion, etc.'
    }
  },
  {
    tableName: "org_savings",
    timestamps: true,
    underscored: true
  }
);

module.exports = OrgSavings;
