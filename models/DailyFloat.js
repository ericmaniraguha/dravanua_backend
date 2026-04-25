const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const DailyFloat = sequelize.define("DailyFloat", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'float_id'
    
    },
  userId: {
      type: DataTypes.UUID,
    field: 'user_id',
    allowNull: true,
    references: { model: 'admin_users', key: 'user_id' }
  },
  departmentId: {
      type: DataTypes.UUID,
    field: 'department_id',
    allowNull: true,
    references: { model: 'departments', key: 'department_id' }
  },
  sn: DataTypes.INTEGER,
  date: DataTypes.DATEONLY,
  countedBy: {
    type: DataTypes.STRING,
    field: 'counted_by'
  },
  notesCoins: {
    type: DataTypes.INTEGER,
    field: 'notes_coins'
  },
  unitPrice: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'unit_price'
  },
  totalPrice: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'total_price'
  },
  paymentMethod: {
    type: DataTypes.STRING,
    field: 'payment_method'
  },
  paymentAccount: {
    type: DataTypes.STRING,
    field: 'payment_account'
  },
  notes: DataTypes.TEXT,
  createdBy: {
    type: DataTypes.STRING,
    field: 'created_by'
  },
  currency: DataTypes.STRING
}, {
  tableName: 'daily_floats',
  timestamps: true,
  underscored: true
});



  return DailyFloat;
};
