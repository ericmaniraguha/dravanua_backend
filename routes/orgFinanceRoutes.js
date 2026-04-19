const express = require("express");
const router = express.Router();
const orgFinanceController = require("../controllers/orgFinanceController");
const { authMiddleware, isSuperAdmin } = require("../middleware/authMiddleware");

// Corporate finance operations require super-admin privileges
router.use(authMiddleware, isSuperAdmin);

router.get("/overview", orgFinanceController.getOverview);

// Loans
router.get("/loans", orgFinanceController.getLoans);
router.post("/loans", orgFinanceController.createLoan);
router.post("/loans/repay", orgFinanceController.recordLoanRepayment);

// Savings
router.get("/savings", orgFinanceController.getSavings);
router.post("/savings", orgFinanceController.createSavingsAccount);
router.post("/savings/transact", orgFinanceController.processSavingsTransaction);

module.exports = router;
