const { DataTypes } = require("sequelize");
const bcrypt = require("bcryptjs");

module.exports = (sequelize) => {
  const Customer = sequelize.define("Customer", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'customer_id'
    
    },
  departmentId: {
    type: DataTypes.UUID,
    field: 'department_id',
    allowNull: true,
    references: { model: 'departments', key: 'department_id' }
  },
  name: {type: DataTypes.STRING,
      field: "cust_name",
    allowNull: false
  },
  email: {type: DataTypes.STRING,
      field: "cust_email",
    allowNull: false,
    unique: true,
    validate: { isEmail: true }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: true
  },
  phone: {
    type: DataTypes.STRING,
    field: "cust_phone",
    allowNull: false
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
  address: {
    type: DataTypes.STRING,
    allowNull: true
  },
  channel: {
    type: DataTypes.ENUM('WhatsApp', 'Website', 'Walk-in', 'Instagram', 'Facebook', 'Referral'),
    defaultValue: 'Website'
  },
  totalSpent: {
    type: DataTypes.DECIMAL(12, 2),
    field: 'total_spent',
    defaultValue: 0
  },
  isActive: {
    type: DataTypes.BOOLEAN,
    field: 'is_active',
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  category: {type: DataTypes.STRING,
      field: "cust_category",
    allowNull: true,
    defaultValue: 'General'
  },
  services: {
    type: DataTypes.TEXT,
    allowNull: true,
    defaultValue: ''
  },
  referredBy: {
    type: DataTypes.STRING,
    field: 'referred_by',
    allowNull: true
  }
}, {
  tableName: 'customers',
  timestamps: true,
  underscored: true,
    indexes: [
      { fields: ['cust_email'] },
      { fields: ['cust_phone'] },
      { fields: ['cust_name'] }
    ],
  hooks: {
    beforeCreate: async (customer) => {
      if (customer.password) {
        const salt = await bcrypt.genSalt(10);
        customer.password = await bcrypt.hash(customer.password, salt);
      }
    },
    beforeUpdate: async (customer) => {
      if (customer.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        customer.password = await bcrypt.hash(customer.password, salt);
      }
    }
  }
});

Customer.prototype.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};



  return Customer;
};
