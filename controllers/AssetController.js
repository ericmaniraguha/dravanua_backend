const { Asset, AssetCategory, AssetMaintenance, AssetTransfer, AssetAssignment, AssetInventory, Department, AdminUser, MessageTemplate, ActivityLog } = require("../models");

const { v4: uuidv4 } = require("uuid");
const { Op } = require("sequelize");

exports.getDashboardStats = async (req, res) => {
  try {
    const totalAssets = await Asset.count();
    const activeAssets = await Asset.count({ where: { status: 'Active' } });
    const underMaintenance = await Asset.count({ where: { status: 'Under Maintenance' } });
    const damaged = await Asset.count({ where: { status: 'Damaged' } });
    
    // Assets per department
    const deptStats = await Asset.findAll({
      attributes: [
        'department_id',
        [Asset.sequelize.fn('COUNT', Asset.sequelize.col('asset_id')), 'count']
      ],
      group: ['department_id'],
      include: [{ model: Department, attributes: ['dept_name'] }]
    });

    // Recent activities (mocking from transfers and assignments for now)
    const recentTransfers = await AssetTransfer.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        { model: Asset, attributes: ['name', 'asset_code'] },
        { model: Department, as: 'ToDepartment', attributes: ['dept_name'] }
      ]
    });

    // Low stock alerts (from inventory)
    const lowStock = await AssetInventory.findAll({
      where: {
        quantity: { [Op.lte]: Asset.sequelize.col('reorder_level') }
      },
      include: [{ model: Asset, attributes: ['name', 'asset_code'] }]
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          total: totalAssets,
          active: activeAssets,
          maintenance: underMaintenance,
          damaged: damaged
        },
        departments: deptStats,
        recentActivities: recentTransfers,
        lowStock: lowStock
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAllAssets = async (req, res) => {
  try {
    const { departmentId, categoryId, status, search } = req.query;
    const where = {};
    
    if (departmentId) where.departmentId = departmentId;
    if (categoryId) where.categoryId = categoryId;
    if (status) where.status = status;
    if (search) {
      where[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { assetCode: { [Op.like]: `%${search}%` } },
        { barcode: { [Op.like]: `%${search}%` } }
      ];
    }

    const assets = await Asset.findAll({
      where,
      include: [
        { model: AssetCategory, attributes: ['name'] },
        { model: Department, attributes: ['dept_name'] },
        { model: AdminUser, as: 'Assignee', attributes: ['user_name'] },
        { model: AdminUser, as: 'Recorder', attributes: ['name', 'user_name'] },
        { model: AdminUser, as: 'Modifier', attributes: ['name', 'user_name'] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({ success: true, data: assets });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createAsset = async (req, res) => {
  try {
    let { categoryId, customCategory, departmentId } = req.body;

    if (customCategory && customCategory.trim() !== '') {
      const [cat] = await AssetCategory.findOrCreate({
        where: { name: customCategory.trim() },
        defaults: { 
          name: customCategory.trim(), 
          departmentId: departmentId || null,
          isActive: true
        }
      });
      categoryId = cat.id;
    }

    const payload = { 
      ...req.body, 
      categoryId,
      assignedTo: req.body.assignedTo === 'OTHERS' ? null : (req.body.assignedTo || null),
      recordedBy: req.user.id,
      modifiedBy: req.user.id 
    };
    const asset = await Asset.create(payload);


    
    // If it's a consumable, initialize inventory
    if (req.body.isConsumable) {
      await AssetInventory.create({
        assetId: asset.id,
        quantity: req.body.initialQuantity || 0,
        reorderLevel: req.body.reorderLevel || 0,
        unit: req.body.unit || 'pcs'
      });
    }

    res.status(201).json({ success: true, data: asset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateAsset = async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: "Asset not found" });

    let { categoryId, customCategory, departmentId } = req.body;

    if (customCategory && customCategory.trim() !== '') {
      const [cat] = await AssetCategory.findOrCreate({
        where: { name: customCategory.trim() },
        defaults: { 
          name: customCategory.trim(), 
          departmentId: departmentId || asset.departmentId,
          isActive: true
        }
      });
      categoryId = cat.id;
    }

    const payload = { 
      ...req.body, 
      categoryId,
      assignedTo: req.body.assignedTo === 'OTHERS' ? null : (req.body.assignedTo || null),
      modifiedBy: req.user.id 
    };
    await asset.update(payload);


    res.status(200).json({ success: true, data: asset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.archiveAsset = async (req, res) => {
  try {
    const { message } = req.body;
    const asset = await Asset.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: "Asset not found" });

    await asset.update({ 
      status: 'Archived',
      modifiedBy: req.user.id 
    });

    // Log the activity with the provided message
    await ActivityLog.create({
      userId: req.user.id,
      userName: req.user.user_name || req.user.name,
      action: 'ARCHIVE_ASSET',
      module: 'Assets',
      details: message || `Asset ${asset.name} (${asset.assetCode}) was archived.`
    });

    res.status(200).json({ success: true, message: "Asset archived successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getMessageTemplates = async (req, res) => {
  try {
    const templates = await MessageTemplate.findAll({
      where: { module: 'Assets', isActive: true }
    });
    res.status(200).json({ success: true, data: templates });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateMessageTemplate = async (req, res) => {
  try {
    const template = await MessageTemplate.findByPk(req.params.id);
    if (!template) return res.status(404).json({ success: false, message: "Template not found" });

    await template.update(req.body);
    res.status(200).json({ success: true, data: template });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};


exports.deleteAsset = async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id);
    if (!asset) return res.status(404).json({ success: false, message: "Asset not found" });

    await asset.destroy();
    res.status(200).json({ success: true, message: "Asset deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getAssetById = async (req, res) => {
  try {
    const asset = await Asset.findByPk(req.params.id, {
      include: [
        { model: AssetCategory },
        { model: Department },
        { model: AdminUser, as: 'Assignee' },
        { model: AdminUser, as: 'Recorder', attributes: ['name', 'user_name', 'role'] },
        { model: AdminUser, as: 'Modifier', attributes: ['name', 'user_name', 'role'] },
        { model: AssetMaintenance, limit: 10, order: [['maintenanceDate', 'DESC']], include: ['Recorder'] },
        { model: AssetTransfer, limit: 10, order: [['transferDate', 'DESC']], include: ['FromDepartment', 'ToDepartment', 'Recorder'] },
        { model: AssetAssignment, limit: 10, order: [['assignedAt', 'DESC']], include: ['Employee'] },
        { model: AssetInventory }
      ]
    });

    if (!asset) return res.status(404).json({ success: false, message: "Asset not found" });

    res.status(200).json({ success: true, data: asset });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.transferAsset = async (req, res) => {
  const t = await Asset.sequelize.transaction();
  try {
    const { assetId, toDepartmentId, reason, requestedBy } = req.body;
    
    const asset = await Asset.findByPk(assetId);
    if (!asset) throw new Error("Asset not found");

    const transfer = await AssetTransfer.create({
      assetId,
      fromDepartmentId: asset.departmentId,
      toDepartmentId,
      reason,
      requestedBy,
      recordedBy: req.user.id,
      modifiedBy: req.user.id,
      status: 'Completed' // Auto-completing for now, can be 'Pending' for approval flow
    }, { transaction: t });

    await asset.update({ departmentId: toDepartmentId }, { transaction: t });

    await t.commit();
    res.status(200).json({ success: true, data: transfer });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.assignAsset = async (req, res) => {
  const t = await Asset.sequelize.transaction();
  try {
    const { assetId, employeeId, condition } = req.body;
    
    const asset = await Asset.findByPk(assetId);
    if (!asset) throw new Error("Asset not found");

    const assignment = await AssetAssignment.create({
      assetId,
      employeeId,
      conditionOnAssignment: condition,
      status: 'Active'
    }, { transaction: t });

    await asset.update({ 
      assignedTo: employeeId,
      status: 'In Use'
    }, { transaction: t });

    await t.commit();
    res.status(200).json({ success: true, data: assignment });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.addMaintenance = async (req, res) => {
  try {
    const payload = { 
      ...req.body, 
      recordedBy: req.user.id,
      modifiedBy: req.user.id 
    };
    const maintenance = await AssetMaintenance.create(payload);
    
    // Update asset status if needed
    if (req.body.status === 'In Progress') {
      await Asset.update({ 
        status: 'Under Maintenance',
        modifiedBy: req.user.id
      }, { where: { id: req.body.assetId } });
    }

    res.status(201).json({ success: true, data: maintenance });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategories = async (req, res) => {
  try {
    const categories = await AssetCategory.findAll({
      where: { isActive: true },
      include: [{ model: Department, attributes: ['dept_name'] }]
    });
    res.status(200).json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
