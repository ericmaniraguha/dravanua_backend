const { AdminUser, SalaryStructure, PayrollRecord, Transaction, Attendance, SalaryAdvance } = require("../models/index");
const { sequelize } = require("../config/db");
const { Op, fn, col } = require("sequelize");

// --- SALARY STRUCTURES ---
exports.getSalaryStructures = async (req, res) => {
  try {
    const structures = await AdminUser.findAll({
      attributes: ['id', 'name', 'role', 'email'],
      include: [{ model: SalaryStructure, as: 'SalaryStructure' }]
    });
    res.json({ success: true, data: structures });
  } catch (error) {
    console.error("❌ Payroll structures error:", error);
    res.status(500).json({ success: false, error: error.message, stack: error.stack });
  }
};

exports.updateSalaryStructure = async (req, res) => {
  try {
    const { userId, baseSalary, allowance, deductions, bankName, accountNumber, paymentCycle, effectiveDate } = req.body;
    let structure = await SalaryStructure.findOne({ where: { userId } });
    if (structure) {
      await structure.update({ baseSalary, allowance, deductions, bankName, accountNumber, paymentCycle, effectiveDate });
    } else {
      structure = await SalaryStructure.create({ userId, baseSalary, allowance, deductions, bankName, accountNumber, paymentCycle, effectiveDate });
    }
    res.json({ success: true, data: structure });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// --- SALARY ADVANCES ---
exports.getAdvances = async (req, res) => {
  try {
    const advances = await SalaryAdvance.findAll({
      include: [{ model: AdminUser, attributes: ['name', 'email'] }],
      order: [['createdAt', 'DESC']]
    });
    res.json({ success: true, data: advances });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.requestAdvance = async (req, res) => {
  try {
    const { userId, amount, reason, requestDate, repaymentDate } = req.body;
    const advance = await SalaryAdvance.create({
      userId,
      amount,
      reason,
      requestDate: requestDate || new Date(),
      expectedRepaymentDate: repaymentDate,
      status: 'Pending'
    });
    res.json({ success: true, data: advance });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateAdvanceStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const advance = await SalaryAdvance.findByPk(req.params.id);
    if (!advance) return res.status(404).json({ success: false, error: "Advance not found" });

    advance.status = status;
    if (status === 'Approved') {
        // Optional: you could create a transaction here if they get cash immediately, 
        // but often it's just reserved for payroll deduction.
    }
    await advance.save();
    res.json({ success: true, data: advance });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// --- PAYROLL GENERATION & MANAGEMENT ---
exports.getPayrollRecords = async (req, res) => {
  try {
    const { month, year, start, end } = req.query;
    const where = {};
    if (month) where.month = parseInt(month);
    if (year) where.year = parseInt(year);
    
    if (start && end) {
       where.createdAt = { [Op.between]: [start + " 00:00:00", end + " 23:59:59"] };
    }

    const records = await PayrollRecord.findAll({
      where,
      include: [{ model: AdminUser, attributes: ['name', 'staffCode'] }],
      order: [['year', 'DESC'], ['month', 'DESC']]
    });
    res.json({ success: true, data: records });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.generatePayroll = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { month, year } = req.body;
    
    // Allow re-generation if records are still PENDING
    const existingCount = await PayrollRecord.count({ where: { month, year } });
    const paidCount = await PayrollRecord.count({ where: { month, year, status: 'Paid' } });

    if (paidCount > 0) {
      return res.status(400).json({ success: false, error: "Cannot re-generate. Some staff members have already been paid for this period." });
    }

    if (existingCount > 0) {
      // Clean up previous pending records to re-calculate everything
      await PayrollRecord.destroy({ where: { month, year, status: { [Op.ne]: 'Paid' } }, transaction: t });
    }

    const staff = await AdminUser.findAll({
      where: { isActive: true },
      include: [{ model: SalaryStructure, as: 'SalaryStructure', required: true }]
    });

    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Get attendance counts
    const attendanceCounts = await Attendance.findAll({
      attributes: ['userId', [fn('COUNT', col('attendance_id')), 'count']],
      where: {
        date: { [Op.between]: [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]] },
        isVerified: true
      },
      group: ['userId']
    });

    const countMap = {};
    attendanceCounts.forEach(c => { countMap[c.userId] = parseInt(c.get('count')) || 0; });

    const periodEnd = new Date(year, month, 0); // Last day of month

    // Get Pending Approved Advances to deduct if their repayment date is within or before this month
    const pendingAdvances = await SalaryAdvance.findAll({
       where: { 
         status: 'Approved',
         expectedRepaymentDate: { [Op.lte]: periodEnd }
       }
    });

    const records = [];
    for (const s of staff) {
      const base = parseFloat(s.SalaryStructure.baseSalary) || 0;
      const allow = parseFloat(s.SalaryStructure.allowance) || 0;
      const staticDeduct = parseFloat(s.SalaryStructure.deductions) || 0;
      const workedDays = countMap[s.id] || 0;
      
      // Skip if salary structure is not yet effective
      if (s.SalaryStructure.effectiveDate && new Date(s.SalaryStructure.effectiveDate) > periodEnd) {
        continue;
      }

      // Calculate total advances for this user
      const userAdvances = pendingAdvances.filter(a => a.userId === s.id);
      const totalAdvanceDeduction = userAdvances.reduce((sum, a) => sum + parseFloat(a.amount), 0);

      let net = 0;
      if (s.SalaryStructure.paymentCycle === 'Daily') {
        net = (base * workedDays) + allow - staticDeduct - totalAdvanceDeduction;
      } else {
        net = base + allow - staticDeduct - totalAdvanceDeduction;
      }

      const payrollRecord = await PayrollRecord.create({
        userId: s.id,
        month,
        year,
        baseAmount: base,
        allowances: allow,
        deductions: staticDeduct + totalAdvanceDeduction,
        netAmount: Math.max(0, net),
        daysWorked: workedDays,
        status: 'Pending'
      }, { transaction: t });

      // Link and Settle Advances
      for (const adv of userAdvances) {
         adv.status = 'Settled';
         adv.payrollRecordId = payrollRecord.id;
         await adv.save({ transaction: t });
      }
      
      records.push(payrollRecord);
    }

    await t.commit();
    res.json({ success: true, count: records.length });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.updateStatus = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { status, notes } = req.body;
    const record = await PayrollRecord.findByPk(req.params.id, {
        include: [{ model: AdminUser }]
    });

    if (!record) return res.status(404).json({ success: false, error: "Record not found" });

    if (status === 'Paid' && record.status !== 'Paid') {
      const transaction = await Transaction.create({
        type: 'Expense',
        amount: record.netAmount,
        category: 'Payroll',
        client: record.AdminUser.name,
        description: `Salary Payment for ${record.month}/${record.year}`,
        date: new Date(),
        paymentMethod: 'Bank',
        departmentId: record.AdminUser.departmentId
      }, { transaction: t });

      record.transactionId = transaction.id;
      record.paymentDate = new Date();
    }

    record.status = status;
    if (notes) record.notes = notes;
    await record.save({ transaction: t });

    await t.commit();
    res.json({ success: true, data: record });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.getAttendanceSummary = async (req, res) => {
  try {
    const { start, end } = req.query;
    const where = { isVerified: true };
    if (start && end) {
      where.date = { [Op.between]: [start, end] };
    }

    const summary = await Attendance.findAll({
      where,
      attributes: [
        'userId',
        'userName',
        [fn('COUNT', col('attendance_id')), 'verifiedCount'],
        [fn('AVG', col('total_hours')), 'avgHours'],
        [sequelize.literal("AVG(HOUR(clock_in) * 60 + MINUTE(clock_in))"), 'avgMinutes'],
        [sequelize.literal("SUM(CASE WHEN TIME(clock_in) < '08:30:00' THEN 1 ELSE 0 END) / COUNT(attendance_id) * 100"), 'earlyRate']
      ],
      include: [{ 
        model: AdminUser, 
        as: 'AdminUser',
        attributes: ['role'] 
      }],
      group: ['userId', 'userName', 'AdminUser.user_id', 'AdminUser.role'],
      order: [[fn('COUNT', col('attendance_id')), 'DESC']]
    });

    const data = summary.map(s => {
      const avgMins = Math.round(s.get('avgMinutes') || 0);
      const h = Math.floor(avgMins / 60).toString().padStart(2, '0');
      const m = (avgMins % 60).toString().padStart(2, '0');

      return {
        userId: s.userId,
        name: s.userName,
        role: s.AdminUser?.role || 'Staff',
        verifiedCount: parseInt(s.get('verifiedCount')) || 0,
        avgHours: parseFloat(s.get('avgHours') || 0).toFixed(1),
        earlyRate: parseFloat(s.get('earlyRate') || 0).toFixed(1),
        avgCheckIn: `${h}:${m}`
      };
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error("Attendance Summary Error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};
