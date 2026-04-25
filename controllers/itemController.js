const { Item, Department } = require("../models/index");

exports.getItems = async (req, res) => {
  try {
    const { departmentId, start, end } = req.query;
    let where = {};
    if (departmentId) where.departmentId = departmentId;
    
    if (start && end) {
      const { Op } = require("sequelize");
      where.createdAt = { [Op.between]: [start + " 00:00:00", end + " 23:59:59"] };
    }
    
    // Role isolation
    if (req.user.role !== "super_admin" && req.user.departmentId !== "all") {
      where.departmentId = req.user.departmentId;
    }

    const items = await Item.findAll({ 
      where, 
      include: [{ model: Department, attributes: ['name'] }],
      order: [['name', 'ASC']] 
    });
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createItem = async (req, res) => {
  try {
    const item = await Item.create(req.body);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateItem = async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });
    await item.update(req.body);
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.deleteItem = async (req, res) => {
  try {
    const item = await Item.findByPk(req.params.id);
    if (!item) return res.status(404).json({ success: false, message: "Item not found" });
    await item.destroy();
    res.json({ success: true, message: "Item deleted" });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
