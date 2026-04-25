const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const AdminUser = sequelize.define("AdminUser",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'user_id'
    },
    name: {type: DataTypes.STRING,
      field: "user_name",
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      field: "user_email",
      allowNull: false,
      unique: {
        msg: "This email address is already registered."
      },
      validate: {
        isEmail: {
          msg: "Please provide a valid email address (e.g., name@example.com)."
        }
      },
    },
    password: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    role: {type: DataTypes.ENUM("super_admin", "service_admin", "user"),
      field: "user_role",
      defaultValue: "service_admin",
    },
    departmentId: {
      type: DataTypes.UUID,
      field: "department_id",
      allowNull: true,
      references: { model: 'departments', key: 'department_id' }
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      field: "is_active",
      defaultValue: true,
    },
    isEmailConfirmed: {
      type: DataTypes.BOOLEAN,
      field: "is_email_confirmed",
      defaultValue: false,
    },
    confirmationToken: {
      type: DataTypes.STRING,
      field: "confirmation_token",
      allowNull: true,
    },
    registrationCode: {
      type: DataTypes.STRING,
      field: "registration_code",
      allowNull: true,
    },
    registrationCodeExpires: {
      type: DataTypes.DATE,
      field: "registration_code_expires",
      allowNull: true,
    },
    resetPasswordCode: {
      type: DataTypes.STRING,
      field: "reset_password_code",
      allowNull: true,
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      field: "reset_password_expires",
      allowNull: true,
    },
    profilePicture: {
      type: DataTypes.STRING,
      field: "profile_picture",
      allowNull: true,
    },
    
    staffCode: {
      type: DataTypes.STRING,
      field: "staff_code",
      unique: true,
    },
    idCardStatus: {
      type: DataTypes.ENUM("pending", "printed", "lost", "expired"),
      field: "id_card_status",
      defaultValue: "pending",
    },
    idCardPrintedAt: {
      type: DataTypes.DATE,
      field: "id_card_printed_at",
      allowNull: true,
    },
    employeeStatus: {
      type: DataTypes.ENUM("active", "on_leave", "terminated", "probation"),
      field: "employee_status",
      defaultValue: "active",
    },
    homeAddress: {
      type: DataTypes.STRING,
      field: "home_address",
      allowNull: true,
      comment: "Verified residence for ID card return policy and logistics",
    },
    signature: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Base64 or URL of the user's digital signature for internal signing",
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: "Session refresh token for secure HttpOnly rotation",
    },
  },
  {
    tableName: "admin_users",
    timestamps: true,
    underscored: true,
    hooks: {
      beforeCreate: async (user) => {
        try {
          // Generate Staff Code
          const year = new Date().getFullYear();
          const count = await AdminUser.count();
          const sequence = String(count + 1).padStart(4, "0");
          user.staffCode = `EMP-${year}-${sequence}`;

          if (user.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        } catch (error) {
          console.error("❌ AdminUser Lifecycle Error (beforeCreate):", error.message);
          throw new Error("Failed to initialize user data: " + error.message);
        }
      },
      beforeUpdate: async (user) => {
        try {
          if (user.changed("password")) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);
          }
        } catch (error) {
          console.error("❌ AdminUser Lifecycle Error (beforeUpdate):", error.message);
          throw new Error("Failed to update security credentials.");
        }
      },
    },
  },
);

AdminUser.prototype.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};



  return AdminUser;
};
