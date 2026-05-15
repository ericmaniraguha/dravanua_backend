const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Booking = sequelize.define("Booking",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'booking_id'
    },
    customerId: {
      type: DataTypes.UUID,
      field: "customer_id",
      allowNull: true,
      references: {
        model: "customers",
        key: "customer_id",
      },
    },
    // customerName and customerEmail removed to follow 3NF.
    // Use associations to fetch customer details.
    departmentId: {
      type: DataTypes.UUID,
      field: "department_id",
      allowNull: true,
      references: {
        model: "departments",
        key: "department_id",
      },
    },
    serviceType: {
      type: DataTypes.ENUM(
        "Studio",
        "Stationery & Office Supplies",
        "Flower Gifts",
        "Classic Fashion",
        "Studio Photography",
        "Event Photography",
        "Videography",
        "Documentary Production",
        "Graphic Design",
        "Flowers & Gifts",
        "Classic Fashion Styling",
        "Other Service"
      ),
      field: "service_type",
      allowNull: false,
    },
    bookingDate: {
      type: DataTypes.DATE,
      field: "booking_date",
      allowNull: false,
      validate: {
        isDate: true,
      }
    },
    status: {type: DataTypes.ENUM("pending", "confirmed", "completed", "cancelled"),
      field: "bk_status",
      defaultValue: "pending",
    },
    totalAmount: {
      type: DataTypes.DECIMAL(12, 2),
      field: "total_amount",
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: "Total amount cannot be negative" }
      }
    },
    amountPaid: {
      type: DataTypes.DECIMAL(12, 2),
      field: "amount_paid",
      defaultValue: 0,
      validate: {
        min: { args: [0], msg: "Amount paid cannot be negative" }
      }
    },
    currency: {
      type: DataTypes.ENUM("RWF", "USD", "EUR", "GBP", "KES", "UGX", "TZS"),
      allowNull: false,
      defaultValue: "RWF",
    },
    location: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: "Studio",
    },
    phoneNumber: {
      type: DataTypes.STRING,
      field: "phone_number",
      allowNull: true,
    },
    countryCode: {
      type: DataTypes.STRING(10),
      field: "country_code",
      allowNull: true,
      defaultValue: "+250"
    },
    countryName: {
      type: DataTypes.STRING,
      field: "country_name",
      allowNull: true,
      defaultValue: "Rwanda"
    },
    paymentMethod: {
      type: DataTypes.STRING,
      field: "payment_method",
      allowNull: true,
    },
    paymentAccount: {
      type: DataTypes.STRING,
      field: "payment_account",
      allowNull: true,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    handledByAdminId: {
      type: DataTypes.UUID,
      field: "handled_by_admin_id",
      allowNull: true,
    },
    handledByAdminName: {
      type: DataTypes.STRING,
      field: "handled_by_admin_name",
      allowNull: true,
    },
    receiptUrl: {
      type: DataTypes.STRING,
      field: "receipt_url",
      allowNull: true,
    },
    // Virtual fields for backward compatibility with 3NF normalization
    customerName: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.Customer ? this.Customer.name : "Guest";
      },
    },
    customerEmail: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.Customer ? this.Customer.email : null;
      },
    },
  },
  {
    tableName: "bookings",
    timestamps: true,
    underscored: true,
    indexes: [
      { fields: ['customer_id'] },
      { fields: ['department_id'] },
      { fields: ['booking_date'] },
      { fields: ['bk_status'] }
    ], // Automatically handle createdAt -> created_at etc.
  },
);



  return Booking;
};
