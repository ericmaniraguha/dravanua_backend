const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Message = sequelize.define("Message", {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'message_id'
    },
    senderId: {
      type: DataTypes.UUID,
      field: 'sender_id',
      allowNull: true,
      references: { model: 'admin_users', key: 'user_id' }
    },
    receiverId: {
      type: DataTypes.UUID,
      field: 'receiver_id',
      allowNull: true,
      references: { model: 'admin_users', key: 'user_id' }
    },
    departmentId: {
      type: DataTypes.UUID,
      field: 'department_id',
      allowNull: true,
      references: { model: 'departments', key: 'department_id' }
    },
    senderName: {
      type: DataTypes.STRING,
      field: 'sender_name',
      allowNull: false
    },
    senderEmail: {
      type: DataTypes.STRING,
      field: 'sender_email',
      allowNull: false
    },
    subject: {
      type: DataTypes.STRING,
      allowNull: true
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      field: 'is_read',
      defaultValue: false
    },
    replied: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    },
    replyContent: {
      type: DataTypes.TEXT,
      field: 'reply_content'
    },
    status: {
      type: DataTypes.STRING(20),
      defaultValue: 'pending'
    },
    category: {
      type: DataTypes.STRING(50),
      defaultValue: 'General'
    },
    urgent: {
      type: DataTypes.BOOLEAN,
      defaultValue: false
    }
  }, {
    tableName: 'messages',
    timestamps: true,
    underscored: true
  });

  return Message;
};
