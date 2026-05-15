const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const MessageTemplate = sequelize.define("MessageTemplate", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'template_id'
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    code: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    module: {
      type: DataTypes.STRING,
      defaultValue: 'Assets',
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      field: 'is_active'
    }
  }, {
    tableName: 'message_templates',
    timestamps: true,
    underscored: true
  });

  MessageTemplate.seedDefaults = async function () {
    try {
      const defaults = [
        {
          name: "Asset Update Confirmation",
          code: "UPDATE_ASSET",
          subject: "Asset Profile Updated",
          content: "The profile for asset {{name}} ({{code}}) has been updated by {{admin}}.",
          module: "Assets"
        },
        {
          name: "Asset Archival Notification",
          code: "ARCHIVE_ASSET",
          subject: "Asset Archived",
          content: "Asset {{name}} ({{code}}) has been moved to archives. Status: ARCHIVED.",
          module: "Assets"
        },
        {
          name: "Maintenance Scheduled",
          code: "MAINTENANCE_SCHEDULE",
          subject: "Asset Maintenance Required",
          content: "Maintenance has been scheduled for {{name}} ({{code}}) on {{date}}.",
          module: "Assets"
        }
      ];

      for (const item of defaults) {
        await MessageTemplate.findOrCreate({
          where: { code: item.code },
          defaults: item,
        });
      }
      console.log("✅ Default message templates synced/seeded");
    } catch (error) {
      console.error("❌ Failed to seed default message templates:", error.message);
    }
  };

  return MessageTemplate;
};
