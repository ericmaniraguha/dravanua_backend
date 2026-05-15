const express = require("express");
const router = express.Router();
const assetController = require("../controllers/AssetController");
// Assuming there is an auth middleware
// const { protect, authorize } = require("../middleware/auth");

router.get("/stats", assetController.getDashboardStats);
router.get("/categories", assetController.getCategories);
router.get("/", assetController.getAllAssets);
router.get("/:id", assetController.getAssetById);
router.post("/", assetController.createAsset);
router.put("/:id", assetController.updateAsset);
router.delete("/:id", assetController.deleteAsset);
router.post("/transfer", assetController.transferAsset);
router.post("/assign", assetController.assignAsset);
router.post("/maintenance", assetController.addMaintenance);
router.put("/:id/archive", assetController.archiveAsset);
router.get("/config/templates", assetController.getMessageTemplates);
router.put("/config/templates/:id", assetController.updateMessageTemplate);


module.exports = router;
