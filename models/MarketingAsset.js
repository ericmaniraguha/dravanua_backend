const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MarketingAsset = sequelize.define("MarketingAsset", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'asset_id'
    
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
  title: {type: DataTypes.STRING,
      field: "ma_title",
    allowNull: false
  },
  imageUrl: {
    type: DataTypes.STRING,
    field: 'image_url',
    allowNull: false
  },
  category: {type: DataTypes.STRING,
      field: "ma_category",
    allowNull: false
  },
  description: {type: DataTypes.TEXT,
      field: "ma_description",
    allowNull: true
  },
  price: {
    type: DataTypes.DECIMAL(12, 2),
    allowNull: true
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    field: 'is_active',
    defaultValue: true
  },
  displayOrder: {
    type: DataTypes.INTEGER,
    field: 'display_order',
    defaultValue: 0
  }
}, {
  tableName: 'marketing_assets',
  timestamps: true,
  underscored: true
});



  return MarketingAsset;
};
