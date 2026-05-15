const express = require("express");
const router = express.Router();
const treasuryController = require("../controllers/treasuryController");
const { authMiddleware } = require("../middleware/authMiddleware");

// All treasury routes require authentication
router.use(authMiddleware);

router.get("/positions", treasuryController.getPositions);
router.post("/positions", treasuryController.createPosition);
router.put("/positions/:id", treasuryController.updatePosition);
router.delete("/positions/:id", treasuryController.deletePosition);
router.get("/stats", treasuryController.getStats);

module.exports = router;
