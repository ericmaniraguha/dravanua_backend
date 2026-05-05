const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Reference = sequelize.define("Reference", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: "reference_id",
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    imagePath: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "image_path",
      comment: "Path to the featured reference image",
    },
  }, {
    tableName: "references",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    underscored: true,
  });

  return Reference;
};
