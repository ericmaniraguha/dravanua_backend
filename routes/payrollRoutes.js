const express = require("express");
const router = express.Router();
const payrollController = require("../controllers/payrollController");
const { authMiddleware, isSuperAdmin } = require("../middleware/authMiddleware");

// All payroll routes require super-admin privileges for security
router.use(authMiddleware, isSuperAdmin);

router.get("/structures", payrollController.getSalaryStructures);
router.post("/structures", payrollController.updateSalaryStructure);

router.get("/records", payrollController.getPayrollRecords);
router.post("/generate", payrollController.generatePayroll);
router.patch("/records/:id", payrollController.updateStatus);

// Salary Advances
router.get("/advances", payrollController.getAdvances);
router.post("/advances", payrollController.requestAdvance);
router.patch("/advances/:id", payrollController.updateAdvanceStatus);

module.exports = router;
