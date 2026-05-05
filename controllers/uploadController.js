const path = require("path");
const fs = require("fs");
const { TeamMember, Gallery, Partner, Reference } = require("../models");

// Ensure upload directories exist
const uploadDirs = {
  employees: path.join(__dirname, "../../uploads/employees"),
  gallery: path.join(__dirname, "../../uploads/gallery"),
  partners: path.join(__dirname, "../../uploads/partners"),
  references: path.join(__dirname, "../../uploads/references")
};
Object.values(uploadDirs).forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Helper to remove existing file if we are replacing
const replaceExistingFile = (dir, prefix, id) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file.startsWith(`${prefix}_${id}.`)) {
      fs.unlinkSync(path.join(dir, file));
    }
  }
};

const getExtension = (originalname) => path.extname(originalname);

exports.uploadEmployeeProfile = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    const { id } = req.body;
    if (!id) return res.status(400).json({ success: false, message: "Employee ID is required" });

    // Check if employee exists
    const employee = await TeamMember.findByPk(id);
    if (!employee) return res.status(404).json({ success: false, message: "Employee not found" });

    // Replace existing
    replaceExistingFile(uploadDirs.employees, "employee", id);

    const ext = getExtension(req.file.originalname);
    const filename = `employee_${id}${ext}`;
    const targetPath = path.join(uploadDirs.employees, filename);
    const publicPath = `/uploads/employees/${filename}`;

    // Move file from tmp
    fs.renameSync(req.file.path, targetPath);

    // Update DB
    await employee.update({ image: publicPath });

    res.status(200).json({ success: true, imagePath: publicPath });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadGalleryImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    
    // No replacement, generate new timestamp
    const timestamp = Date.now();
    const ext = getExtension(req.file.originalname);
    const filename = `gallery_${timestamp}${ext}`;
    const targetPath = path.join(uploadDirs.gallery, filename);
    const publicPath = `/uploads/gallery/${filename}`;

    fs.renameSync(req.file.path, targetPath);

    const { title, category, description } = req.body;

    const gallery = await Gallery.create({
      title: title || `Gallery Image ${timestamp}`,
      category: category || "Uncategorized",
      description: description || "",
      imageUrl: publicPath,
      userId: req.user ? req.user.id : null,
    });

    res.status(201).json({ success: true, gallery, imagePath: publicPath });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadPartnerLogo = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    const { id, name, websiteUrl, description } = req.body;
    if (!id) return res.status(400).json({ success: false, message: "Partner ID is required" });

    let partner = await Partner.findByPk(id);
    if (!partner && name) {
      // Create if doesn't exist but has a name provided
      partner = await Partner.create({ id, name, websiteUrl, description });
    } else if (!partner) {
      return res.status(404).json({ success: false, message: "Partner not found" });
    }

    replaceExistingFile(uploadDirs.partners, "partner", partner.id);

    const ext = getExtension(req.file.originalname);
    const filename = `partner_${partner.id}${ext}`;
    const targetPath = path.join(uploadDirs.partners, filename);
    const publicPath = `/uploads/partners/${filename}`;

    fs.renameSync(req.file.path, targetPath);

    await partner.update({ logo: publicPath });

    res.status(200).json({ success: true, logoPath: publicPath, partner });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.uploadFeaturedReference = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ success: false, message: "No file uploaded" });
    const { id, title, description } = req.body;
    if (!id) return res.status(400).json({ success: false, message: "Reference ID is required" });

    let reference = await Reference.findByPk(id);
    if (!reference && title) {
      reference = await Reference.create({ id, title, description });
    } else if (!reference) {
      return res.status(404).json({ success: false, message: "Reference not found" });
    }

    replaceExistingFile(uploadDirs.references, "reference", reference.id);

    const ext = getExtension(req.file.originalname);
    const filename = `reference_${reference.id}${ext}`;
    const targetPath = path.join(uploadDirs.references, filename);
    const publicPath = `/uploads/references/${filename}`;

    fs.renameSync(req.file.path, targetPath);

    await reference.update({ imagePath: publicPath });

    res.status(200).json({ success: true, imagePath: publicPath, reference });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
