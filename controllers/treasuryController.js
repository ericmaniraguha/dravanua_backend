const { TreasuryPosition, OrgLoan, OrgSavings, Department } = require("../models");
const { Op } = require("sequelize");

module.exports = {
  getPositions: async (req, res) => {
    try {
      const { start, end } = req.query;
      let where = {};
      if (start && end) {
        where.date = { [Op.between]: [start, end] };
      }

      const data = await TreasuryPosition.findAll({
        where,
        order: [['date', 'DESC']]
      });
      res.json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  createPosition: async (req, res) => {
    try {
      const body = { ...req.body };
      if (req.user) {
        body.preparedBy = req.user.name;
      }
      
      const data = await TreasuryPosition.create(body);
      res.status(201).json({ success: true, data });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  updatePosition: async (req, res) => {
    try {
      const item = await TreasuryPosition.findByPk(req.params.id);
      if (!item) return res.status(404).json({ success: false, error: "Not found" });
      
      await item.update(req.body);
      res.json({ success: true, data: item });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  deletePosition: async (req, res) => {
    try {
      const item = await TreasuryPosition.findByPk(req.params.id);
      if (!item) return res.status(404).json({ success: false, error: "Not found" });
      
      await item.destroy();
      res.json({ success: true, message: "Deleted" });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },

  getStats: async (req, res) => {
    try {
      // Calculate current debt, reserves, etc. from live models
      const loans = await OrgLoan.findAll({ where: { status: 'Active' } });
      const savings = await OrgSavings.findAll();
      
      const totalDebt = loans.reduce((acc, l) => acc + parseFloat(l.remainingBalance || l.principalAmount), 0);
      const totalReserves = savings.reduce((acc, s) => acc + parseFloat(s.currentBalance), 0);
      
      // Get latest treasury position for cash balances
      const latestPos = await TreasuryPosition.findOne({ order: [['date', 'DESC']] });

      res.json({
        success: true,
        data: {
          totalDebt,
          totalReserves,
          cashBalance: latestPos ? latestPos.closingCashBalance : 0,
          liquidityRatio: latestPos ? latestPos.currentRatio : 0,
          riskLevel: latestPos ? latestPos.liquidityRiskLevel : 'Low'
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  }
};
