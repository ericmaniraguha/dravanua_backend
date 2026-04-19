const { ReceiptDocument, AdminUser } = require("../models");
const fs = require("fs");
const path = require("path");

// Stub for Dropbox upload - In production, this would use Dropbox API
const uploadReceiptToDropbox = async (file, dept, year, month, category) => {
  // We'll mock Dropbox by saving it to a local 'uploads/dropbox_mock' folder
  // which simulates Dropbox paths: department/year/month/category/file-name
  const baseDir = path.join(__dirname, '..', 'uploads', 'dropbox_mock');
  const targetDir = path.join(baseDir, String(dept), String(year), String(month), String(category));
  
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  const fileName = `${Date.now()}-${file.originalname}`;
  const targetPath = path.join(targetDir, fileName);
  
  fs.copyFileSync(file.path, targetPath);
  
  // Return the "Dropbox" url
  return `/uploads/dropbox_mock/${dept}/${year}/${month}/${category}/${fileName}`;
};

const getReceipts = async (req, res) => {
  try {
    const { department_id, status, category, search } = req.query;
    
    const whereClause = {};
    
    // RBAC
    if (req.user.role === 'user') {
      whereClause.uploaded_by = req.user.id;
    } else if (req.user.role === 'service_admin') {
      if (req.user.departmentId) {
        whereClause.department_id = req.user.departmentId;
      }
    }
    // Super admin sees all

    if (department_id) whereClause.department_id = department_id;
    if (status) whereClause.status = status;
    if (category) whereClause.category = category;

    // We can add text search on title, supplier, receipt_file_name if needed.
    
    const receipts = await ReceiptDocument.findAll({
      where: whereClause,
      include: [
        { model: AdminUser, as: 'Uploader', attributes: ['id', 'name'] },
        { model: AdminUser, as: 'Approver', attributes: ['id', 'name'] }
      ],
      order: [['created_at', 'DESC']]
    });

    res.status(200).json({ success: true, data: receipts });
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: 'Failed to fetch receipts' });
  }
};

const uploadReceipt = async (req, res) => {
  try {
    const {
      title, description, category, department_id, amount, currency,
      supplier_name, expense_date
    } = req.body;

    // File is now optional
    let receiptUrl = null;
    let originalName = null;
    let mimeType = null;

    if (req.file) {
      const year = new Date(expense_date || Date.now()).getFullYear();
      const month = new Date(expense_date || Date.now()).toLocaleString('default', { month: 'long' }).toLowerCase();
      receiptUrl = await uploadReceiptToDropbox(req.file, department_id, year, month, category);
      originalName = req.file.originalname;
      mimeType = req.file.mimetype;
    }

    const receipt = await ReceiptDocument.create({
      title,
      description,
      category,
      departmentId: department_id,
      amount,
      currency: currency || 'RWF',
      supplierName: supplier_name,
      expenseDate: expense_date,
      receiptUrl: receiptUrl,
      receiptFileName: originalName,
      receiptType: mimeType,
      uploadedBy: req.user.id,
      status: 'Pending'
    });

    res.status(201).json({ success: true, data: receipt });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ success: false, message: 'Failed to upload receipt', error: error.message, stack: error.stack });
  }
};

const updateReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await ReceiptDocument.findByPk(id);
    
    if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });
    
    if (req.user.role === 'user' && receipt.uploadedBy !== req.user.id) {
       return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    await receipt.update(req.body);
    res.status(200).json({ success: true, data: receipt });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update receipt' });
  }
};

const approveReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body; // Approved, Rejected
    
    if (req.user.role === 'user') {
      return res.status(403).json({ success: false, message: 'Unauthorized to approve documents' });
    }

    const receipt = await ReceiptDocument.findByPk(id);
    if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });
    
    await receipt.update({
      status,
      approvedBy: req.user.id
    });
    
    res.status(200).json({ success: true, data: receipt });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to approve receipt' });
  }
};

const deleteReceipt = async (req, res) => {
  try {
    const { id } = req.params;
    const receipt = await ReceiptDocument.findByPk(id);
    if (!receipt) return res.status(404).json({ success: false, message: 'Receipt not found' });
    
    if (req.user.role === 'user') {
       return res.status(403).json({ success: false, message: 'Users cannot delete documents. Contact Admin.' });
    }
    
    await receipt.destroy();
    res.status(200).json({ success: true, message: 'Receipt deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete receipt' });
  }
};

module.exports = {
  getReceipts,
  uploadReceipt,
  updateReceipt,
  approveReceipt,
  deleteReceipt
};
