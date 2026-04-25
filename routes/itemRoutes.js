const express = require("express");
const router = express.Router();
const { 
  getItems, 
  createItem, 
  updateItem, 
  deleteItem 
} = require("../controllers/itemController");
const { authMiddleware, isSuperAdmin } = require("../middleware/authMiddleware");

// All routes are protected
router.use(authMiddleware);

router.get("/", getItems);
router.post("/", createItem);
router.put("/:id", updateItem);
router.delete("/:id", deleteItem);

module.exports = router;
