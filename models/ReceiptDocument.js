const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const ReceiptDocument = sequelize.define('ReceiptDocument', {
  id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
      field: 'document_id'
    },
  title: {type: DataTypes.STRING,
      field: "rd_title",
    allowNull: false
  },
  description: {type: DataTypes.TEXT,
      field: "rd_description",
    allowNull: true
  },
  category: {type: DataTypes.STRING,
      field: "rd_category",
    allowNull: false
  },
  departmentId: {
      type: DataTypes.UUID,
    field: 'department_id',
    allowNull: false
  },
  amount: {type: DataTypes.DECIMAL(12, 2),
      field: "rd_amount",
    allowNull: false
  },
  currency: {
    type: DataTypes.STRING,
    defaultValue: 'RWF'
  },
  supplierName: {
    type: DataTypes.STRING,
    field: 'supplier_name',
    allowNull: true
  },
  expenseDate: {
    type: DataTypes.DATEONLY,
    field: 'expense_date',
    allowNull: false
  },
  receiptUrl: {
    type: DataTypes.STRING,
    field: 'receipt_url',
    allowNull: true
  },
  receiptFileName: {
    type: DataTypes.STRING,
    field: 'receipt_file_name',
    allowNull: true
  },
  receiptType: {
    type: DataTypes.STRING,
    field: 'receipt_type',
    allowNull: true
  },
  uploadedBy: {
    type: DataTypes.UUID,
    field: 'uploaded_by',
    allowNull: false
  },
  approvedBy: {
    type: DataTypes.UUID,
    field: 'approved_by',
    allowNull: true
  },
  status: {type: DataTypes.STRING,
      field: "rd_status",
    defaultValue: 'Pending'
  }
}, {
  tableName: 'receipt_documents',
  timestamps: true,
  underscored: true
});

module.exports = ReceiptDocument;
