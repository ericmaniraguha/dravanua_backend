const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Operation = sequelize.define("Operation",
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
    department: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    priority: {
      type: DataTypes.ENUM("Low", "Medium", "High"),
      defaultValue: "Medium",
    },
    startTime: {
      type: DataTypes.STRING, // Store as "HH:mm" or similar
      allowNull: true,
    },
    endTime: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    assignedTo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM("Pending", "In Progress", "Completed", "Cancelled"),
      defaultValue: "Pending",
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    onTime: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    customerId: {
      type: DataTypes.UUID,
      field: 'customer_id',
      allowNull: true,
      references: { model: 'customers', key: 'customer_id' }
    },
    customerName: {
      type: DataTypes.STRING,
      field: 'customer_name',
      allowNull: true,
    },
    serviceType: {
      type: DataTypes.STRING,
      field: 'service_type',
      allowNull: true,
    }
  },
  {
    tableName: "operations",
    timestamps: true,
    underscored: true,
  }
);



  return Operation;
};
