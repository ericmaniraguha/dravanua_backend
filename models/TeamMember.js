const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const TeamMember = sequelize.define(
  "TeamMember",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'team_member_id'
    },
    name: {type: DataTypes.STRING,
      field: "tm_name",
      allowNull: false,
    },
    role: {type: DataTypes.STRING,
      field: "tm_role",
      allowNull: false,
    },
    initials: {
      type: DataTypes.STRING(5),
      allowNull: true,
    },
    linkedin: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    email: {type: DataTypes.STRING,
      field: "tm_email",
      allowNull: true,
    },
    phone: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    image: {
      type: DataTypes.STRING,
      allowNull: true,
      field: "photo",
    },
    isHired: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: "is_active",
    },
    order: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      field: "sort_order",
    },
    adminUserId: {
      type: DataTypes.UUID,
      field: "admin_user_id",
      allowNull: true,
    },
  },
  {
    tableName: "team_members",
    timestamps: true,
    underscored: true,
  }
);

module.exports = TeamMember;
