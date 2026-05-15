const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const TreasuryPosition = sequelize.define("TreasuryPosition", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    organizationName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    reportingPeriod: {
      type: DataTypes.STRING, // Daily / Weekly / Monthly
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    currency: {
      type: DataTypes.STRING(3),
      defaultValue: 'RWF',
    },
    preparedBy: {
      type: DataTypes.STRING,
    },
    // Debt Portfolio
    totalOutstandingDebt: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    shortTermDebt: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    longTermDebt: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    avgInterestRate: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0
    },
    // Reserve Capital
    totalReserveCapital: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    minRequiredReserve: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    // Liquidity
    openingCashBalance: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    closingCashBalance: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    netCashFlow: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    currentRatio: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    quickRatio: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0
    },
    // Forecast
    forecastPeriodDays: {
      type: DataTypes.INTEGER,
      defaultValue: 30
    },
    expectedInflows: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    expectedOutflows: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    projectedCashPosition: {
      type: DataTypes.DECIMAL(15, 2),
      defaultValue: 0
    },
    liquidityRiskLevel: {
      type: DataTypes.ENUM('Low', 'Medium', 'High'),
      defaultValue: 'Low'
    },
    // Meta
    approvalStatus: {
      type: DataTypes.ENUM('Draft', 'Pending', 'Approved'),
      defaultValue: 'Draft'
    },
    approvedBy: DataTypes.STRING,
    complianceCheck: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    auditNotes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    department_id: {
      type: DataTypes.UUID,
      allowNull: true
    }
  }, {
    tableName: 'treasury_positions',
    timestamps: true,
    underscored: true
  });

  return TreasuryPosition;
};
