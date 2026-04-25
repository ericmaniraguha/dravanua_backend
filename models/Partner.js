const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Partner = sequelize.define("Partner",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: "partner_id",
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    logo: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: "URL or path to the partner logo image",
    },
    websiteUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "website_url",
    },
    category: {
      type: DataTypes.STRING,
      defaultValue: "Partner",
      comment: "e.g., Corporate Partner, Referencing Client, Strategic Ally",
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      comment: "Display order on the frontend",
    },
  },
  {
    tableName: "partners",
    timestamps: true,
    underscored: true,
  },
);



  return Partner;
};
