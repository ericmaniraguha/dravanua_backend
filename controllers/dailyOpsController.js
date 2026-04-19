const DailyReport = require("../models/DailyReport");
const Expense = require("../models/Expense");
const Purchase = require("../models/Purchase");
const DailyFloat = require("../models/DailyFloat");
const DailyRequest = require("../models/DailyRequest");
const { Op } = require("sequelize");
const Department = require('../models/Department');

const resolveDepartment = async (body) => {
  if (body.department) {
    body.departmentId = await Department.resolveId(body.department);
  }
  return body;
};

const createHandler = (Model) => {
  return {
    getAll: async (req, res) => {
      try {
        const { start, end, currency } = req.query;
        let where = {};
        if (start && end) {
          where.date = { [Op.between]: [start, end] };
        }
        if (currency && currency !== "all") {
          where.currency = currency;
        }

        // Department-based access control
        if (req.user && req.user.role !== "super_admin" && req.user.departmentId) {
          where.department_id = req.user.departmentId;
        }

        const data = await Model.findAll({ where, order: [["date", "DESC"]] });
        res.json({ success: true, data });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    },
    create: async (req, res) => {
      try {
        let body = { ...req.body };
        
        // Link to the user who created it (Referential Integrity)
        if (req.user) {
          body.userId = req.user.id;
          body.createdBy = req.user.name; // Keep string for legacy display
          if (!body.departmentId && req.user.departmentId && req.user.departmentId !== 'all') {
             body.departmentId = req.user.departmentId;
          }
        }

        body = await resolveDepartment(body);
        
        const data = await Model.create(body);
        res.status(201).json({ success: true, data });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    },
    update: async (req, res) => {
      try {
        let body = { ...req.body };
        const item = await Model.findByPk(req.params.id);
        if (!item)
          return res.status(404).json({ success: false, error: "Not found" });
        
        body = await resolveDepartment(body);
        await item.update(body);
        res.json({ success: true, data: item });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    },
    delete: async (req, res) => {
      try {
        const item = await Model.findByPk(req.params.id);
        if (!item)
          return res.status(404).json({ success: false, error: "Not found" });
        await item.destroy();
        res.json({ success: true, message: "Deleted successfully" });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    },
  };
};

module.exports = {
  reports: {
    getAll: async (req, res) => {
      try {
        const { start, end, currency } = req.query;
        let where = {};
        if (start && end) where.date = { [Op.between]: [start, end] };
        if (currency && currency !== "all") where.currency = currency;
        if (req.user && req.user.role !== "super_admin" && req.user.departmentId) where.department_id = req.user.departmentId;

        const Department = require("../models/Department");
        const deptMap = await Department.getNameMap();
        const data = await DailyReport.findAll({ where, order: [['date', 'DESC']] });
        res.json({ success: true, data: data.map(r => ({ ...r.toJSON(), department: deptMap[r.departmentId] || 'Other' })) });
      } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    },
    create: createHandler(DailyReport).create,
    update: createHandler(DailyReport).update,
    delete: createHandler(DailyReport).delete,
  },
  expenses: {
    getAll: async (req, res) => {
      try {
        const { start, end } = req.query;
        let where = {};
        if (start && end) {
          where.date = { [Op.between]: [start, end] };
        }

        if (req.user && req.user.role !== "super_admin" && req.user.departmentId) {
          where.department_id = req.user.departmentId;
        }

        // Fetch from all operational sources
        const reports = await DailyReport.findAll({ where });
        const expenses = await Expense.findAll({ where });
        const purchases = await Purchase.findAll({ where });

        // Get department names for filtering
        const Department = require("../models/Department");
        const deptMap = await Department.getNameMap();

        // Normalize into a single ledger for "EXPENSES 2026" view
        const unified = [
          ...reports.map(r => {
            const json = r.toJSON();
            return {
              ...json,
              type: 'SALE',
              sn: json.sin || `S-${json.id}`,
              description: json.service,
              details: json.contactPerson,
              approvedBy: 'N/A (Revenue)',
              status: json.isPaid ? 'cleared' : 'pending',
              department: deptMap[json.departmentId] || 'Other',
              unitPrice: json.unitPrice || json.unit_price,
              totalPrice: json.totalPrice || json.total_price,
              paymentMethod: json.paymentMethod || json.payment_method,
              paymentAccount: json.paymentAccount || json.payment_account,
              notes: json.notes
            };
          }),
          ...expenses.map(e => {
            const json = e.toJSON();
            return {
              ...json,
              type: 'EXPENSE',
              sn: json.sn || `E-${json.id}`,
              description: json.description,
              details: json.details,
              approvedBy: json.approvedBy || 'Pending Review',
              status: json.status || 'pending',
              department: deptMap[json.departmentId] || 'Other',
              unitPrice: json.unitPrice || json.unit_price,
              totalPrice: json.totalPrice || json.total_price,
              paymentMethod: json.paymentMethod || json.payment_method,
              paymentAccount: json.paymentAccount || json.payment_account,
              notes: json.notes
            };
          }),
          ...purchases.map(p => {
            const json = p.toJSON();
            return {
              ...json,
              type: 'PURCHASE',
              sn: json.sn || `P-${json.id}`,
              description: json.description,
              details: json.details,
              approvedBy: json.approvedBy || 'Pending Review',
              status: json.status || 'pending',
              department: deptMap[json.departmentId] || 'Other',
              unitPrice: json.unitPrice || json.unit_price,
              totalPrice: json.totalPrice || json.total_price,
              paymentMethod: json.paymentMethod || json.payment_method,
              paymentAccount: json.paymentAccount || json.payment_account,
              notes: json.notes
            };
          })
        ].sort((a, b) => new Date(b.date) - new Date(a.date));

        res.json({ success: true, data: unified });
      } catch (err) {
        res.status(500).json({ success: false, error: err.message });
      }
    },
    create: createHandler(Expense).create,
    update: createHandler(Expense).update,
    delete: createHandler(Expense).delete,
  },
  purchases: {
    getAll: async (req, res) => {
      try {
        const { start, end } = req.query;
        let where = {};
        if (start && end) where.date = { [Op.between]: [start, end] };
        if (req.user && req.user.role !== "super_admin" && req.user.departmentId) where.department_id = req.user.departmentId;

        const Department = require("../models/Department");
        const deptMap = await Department.getNameMap();
        const data = await Purchase.findAll({ where, order: [['date', 'DESC']] });
        res.json({ success: true, data: data.map(p => ({ ...p.toJSON(), department: deptMap[p.departmentId] || 'Other' })) });
      } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    },
    create: createHandler(Purchase).create,
    update: createHandler(Purchase).update,
    delete: createHandler(Purchase).delete,
  },
  float: {
    getAll: async (req, res) => {
      try {
        const { start, end } = req.query;
        let where = {};
        if (start && end) where.date = { [Op.between]: [start, end] };
        if (req.user && req.user.role !== "super_admin" && req.user.departmentId) where.department_id = req.user.departmentId;

        const Department = require("../models/Department");
        const deptMap = await Department.getNameMap();
        const data = await DailyFloat.findAll({ where, order: [['date', 'DESC']] });
        res.json({ success: true, data: data.map(f => ({ ...f.toJSON(), department: deptMap[f.departmentId] || 'Other' })) });
      } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    },
    create: createHandler(DailyFloat).create,
    update: createHandler(DailyFloat).update,
    delete: createHandler(DailyFloat).delete,
  },
  requests: {
    getAll: async (req, res) => {
      try {
        const { start, end } = req.query;
        let where = {};
        if (start && end) where.date = { [Op.between]: [start, end] };
        if (req.user && req.user.role !== "super_admin" && req.user.departmentId) where.department_id = req.user.departmentId;

        const Department = require("../models/Department");
        const deptMap = await Department.getNameMap();
        const data = await DailyRequest.findAll({ where, order: [['date', 'DESC']] });
        res.json({ success: true, data: data.map(r => ({ ...r.toJSON(), department: deptMap[r.departmentId] || 'Other' })) });
      } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    },
    create: createHandler(DailyRequest).create,
    update: createHandler(DailyRequest).update,
    delete: createHandler(DailyRequest).delete,
  },
  operations: {
    getAll: async (req, res) => {
      try {
        const { date } = req.query;
        let where = {};
        if (date) where.date = date;
        if (req.user && req.user.role !== "super_admin" && req.user.departmentId) {
          where.department_id = req.user.departmentId;
        }
        const Operation = require("../models/Operation");
        const data = await Operation.findAll({ where, order: [['startTime', 'ASC']] });
        res.json({ success: true, data });
      } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    },
    create: async (req, res) => {
      try {
        const Operation = require("../models/Operation");
        let body = { ...req.body };
        const data = await Operation.create(body);
        res.status(201).json({ success: true, data });
      } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    },
    update: async (req, res) => {
      try {
        const Operation = require("../models/Operation");
        const item = await Operation.findByPk(req.params.id);
        if (!item) return res.status(404).json({ success: false, error: "Operation not found" });
        await item.update(req.body);
        res.json({ success: true, data: item });
      } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    },
    delete: async (req, res) => {
      try {
        const Operation = require("../models/Operation");
        const item = await Operation.findByPk(req.params.id);
        if (!item) return res.status(404).json({ success: false, error: "Operation not found" });
        await item.destroy();
        res.json({ success: true, message: "Deleted" });
      } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    }
  },
  tasks: {
    getAll: async (req, res) => {
      try {
        const Task = require("../models/Task");
        const data = await Task.findAll({ order: [['createdAt', 'DESC']] });
        res.json({ success: true, data });
      } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    },
    create: async (req, res) => {
      try {
        const Task = require("../models/Task");
        const data = await Task.create(req.body);
        res.status(201).json({ success: true, data });
      } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    },
    delete: async (req, res) => {
      try {
        const Task = require("../models/Task");
        const item = await Task.findByPk(req.params.id);
        if (!item) return res.status(404).json({ success: false, error: "Task not found" });
        await item.destroy();
        res.json({ success: true, message: "Deleted" });
      } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    }
  },
  schedule: {
    getAll: async (req, res) => {
      try {
        const { date } = req.query;
        let where = {};
        if (date) where.date = date;
        const Operation = require("../models/Operation");
        // Schedule is basically operations with a time slot
        const data = await Operation.findAll({ where, order: [['startTime', 'ASC']] });
        res.json({ success: true, data });
      } catch (err) { res.status(500).json({ success: false, error: err.message }); }
    }
  }
};
