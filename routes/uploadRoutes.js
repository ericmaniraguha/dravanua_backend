const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { authMiddleware } = require("../middleware/authMiddleware");

const {
  uploadEmployeeProfile,
  uploadGalleryImage,
  uploadPartnerLogo,
  uploadFeaturedReference
} = require("../controllers/uploadController");

const router = express.Router();

// Use an OS temp dir or a local tmp dir
const tmpDir = path.join(__dirname, "../../uploads/tmp");
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

const upload = multer({ dest: tmpDir });

router.post("/employee", authMiddleware, upload.single("image"), uploadEmployeeProfile);
router.post("/gallery", authMiddleware, upload.single("image"), uploadGalleryImage);
router.post("/partner", authMiddleware, upload.single("logo"), uploadPartnerLogo);
router.post("/reference", authMiddleware, upload.single("image"), uploadFeaturedReference);

module.exports = router;
