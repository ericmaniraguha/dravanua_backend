const { OrgLoan, OrgSavings, OrgFinanceLog, Transaction } = require("../models/index");
const { sequelize } = require("../config/db");

// GET /api/v1/admin/org-finance/overview
exports.getOverview = async (req, res) => {
  try {
    const totalLoans = await OrgLoan.sum('remaining_balance') || 0;
    const totalSavings = await OrgSavings.sum('current_balance') || 0;
    res.json({ success: true, data: { totalLoans, totalSavings } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// --- LOANS ---
exports.getLoans = async (req, res) => {
  try {
    const loans = await OrgLoan.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: loans });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createLoan = async (req, res) => {
  try {
    const { loanName, lender, principalAmount, interestRate, termMonths, startDate, monthlyInstallment } = req.body;
    const loan = await OrgLoan.create({
      loanName, lender, principalAmount, interestRate, termMonths, startDate,
      remainingBalance: principalAmount,
      monthlyInstallment,
      status: 'Active'
    });
    res.json({ success: true, data: loan });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.recordLoanRepayment = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { loanId, amount, description } = req.body;
    const loan = await OrgLoan.findByPk(loanId);
    if (!loan) return res.status(404).json({ success: false, error: "Loan not found" });

    // Update Loan Balance
    loan.remainingBalance = parseFloat(loan.remainingBalance) - parseFloat(amount);
    if (loan.remainingBalance <= 0) {
        loan.remainingBalance = 0;
        loan.status = 'Fully Paid';
    }
    await loan.save({ transaction: t });

    // Create Finance Log
    const log = await OrgFinanceLog.create({
      type: 'Loan Repayment',
      loanId,
      amount,
      description
    }, { transaction: t });

    // Create Transaction in Ledger
    const trans = await Transaction.create({
      type: 'Expense',
      amount,
      category: 'Loan Repayment',
      client: loan.lender,
      description: `Repayment for ${loan.loanName}: ${description}`,
      date: new Date(),
      paymentMethod: 'Bank'
    }, { transaction: t });

    log.transactionId = trans.id;
    await log.save({ transaction: t });

    await t.commit();
    res.json({ success: true, data: loan });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};

// --- SAVINGS ---
exports.getSavings = async (req, res) => {
  try {
    const savings = await OrgSavings.findAll({ order: [['createdAt', 'DESC']] });
    res.json({ success: true, data: savings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.createSavingsAccount = async (req, res) => {
  try {
    const { accountName, bankName, accountNumber, currentBalance, currency, purpose } = req.body;
    const savings = await OrgSavings.create({
      accountName, bankName, accountNumber, currentBalance, currency, purpose
    });
    res.json({ success: true, data: savings });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.processSavingsTransaction = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { savingsId, type, amount, description } = req.body;
    const savings = await OrgSavings.findByPk(savingsId);
    if (!savings) return res.status(404).json({ success: false, error: "Savings account not found" });

    if (type === 'Savings Deposit') {
      savings.currentBalance = parseFloat(savings.currentBalance) + parseFloat(amount);
    } else if (type === 'Savings Withdrawal') {
      if (parseFloat(savings.currentBalance) < parseFloat(amount)) {
          return res.status(400).json({ success: false, error: "Insufficient balance" });
      }
      savings.currentBalance = parseFloat(savings.currentBalance) - parseFloat(amount);
    }
    await savings.save({ transaction: t });

    const log = await OrgFinanceLog.create({
      type,
      savingsId,
      amount,
      description
    }, { transaction: t });

    // Ledger Entry
    const trans = await Transaction.create({
      type: type === 'Savings Deposit' ? 'Expense' : 'Sale', // Deposit into savings is cash outflow from oper, Withdrawal is inflow
      amount,
      category: 'Savings Movement',
      client: savings.bankName,
      description: `${type} - ${savings.accountName}: ${description}`,
      date: new Date(),
      paymentMethod: 'Bank'
    }, { transaction: t });

    log.transactionId = trans.id;
    await log.save({ transaction: t });

    await t.commit();
    res.json({ success: true, data: savings });
  } catch (error) {
    await t.rollback();
    res.status(500).json({ success: false, error: error.message });
  }
};
