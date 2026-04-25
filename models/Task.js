const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Task = sequelize.define("Task",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    assignedTo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    dueDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM("Low", "Medium", "High"),
      defaultValue: "Medium",
    },
    category: {
      type: DataTypes.STRING,
      defaultValue: "General",
    },
    status: {
      type: DataTypes.ENUM("Pending", "Completed"),
      defaultValue: "Pending",
    }
  },
  {
    tableName: "tasks",
    timestamps: true,
    underscored: true,
  }
);



  return Task;
};
