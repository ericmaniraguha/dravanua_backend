const express = require("express");
const router = express.Router();
const {
  adminLogin,
  seedAdmin,
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  confirmEmail,
  getModules,
  updateModule,
  getPerformanceStats,
  getAttendance,
  clockIn,
  clockOut,
  getGallery,
  createGalleryItem,
  updateGalleryItem,
  deleteGalleryItem,
  getMessages,
  replyToMessage,
  getCustomers,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getAnalytics,
  getBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  getTransactions,
  createTransaction,
  deleteTransaction,
  updateTransaction,
  sendUserActivityReport,
  getMarketingAssets,
  createMarketingAsset,
  updateMarketingAsset,
  deleteMarketingAsset,
  getPublicMarketingAssets,
  completeSignup,
  forgotPassword,
  resetPassword,
  resendCode,
  uploadImage,
  upload,
  getDropboxFiles,
  uploadToDropbox,
  updateProfile,
  getOfficeLocation,
  getOfficeLocations,
  updateOfficeLocation,
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getDepartments,
  verifyAttendance,
  adminRefresh,
  adminLogout,
  getPartners,
  createPartner,
  updatePartner,
  deletePartner,
  getPublicPartners,
} = require("../controllers/adminController");
const {
  authMiddleware,
  isSuperAdmin,
} = require("../middleware/authMiddleware");

const {
  getReceipts,
  uploadReceipt,
  updateReceipt,
  approveReceipt,
  deleteReceipt
} = require("../controllers/receiptController");

// Public admin routes
router.post("/login", adminLogin);
router.post("/seed", seedAdmin);
router.get("/confirm-email", confirmEmail);
router.post("/signup", completeSignup);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post(
  "/upload-image",
  authMiddleware,
  upload.single("image"),
  uploadImage,
);
router.put("/profile", authMiddleware, updateProfile);
router.post("/refresh", adminRefresh);
router.post("/logout", authMiddleware, adminLogout);

// Retrieve updated DB status for user session on refresh
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const { AdminUser, Department } = require("../models/index");
    const user = await AdminUser.findByPk(req.user.id, {
      attributes: ["id", "name", "email", "role", "isActive", "departmentId"],
      include: [{ model: Department, attributes: ["name", "code"] }]
    });

    if (!user || user.role === "user" || !user.isActive) {
      return res.status(401).json({ success: false, message: "Unauthorized or disabled" });
    }

    // Flatten department for the frontend if it exists
    const userData = user.toJSON();
    if (userData.Department) {
      userData.department = userData.Department.name;
      userData.deptCode = userData.Department.code;
    }

    res.json({ success: true, data: userData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Core Admin Routes
router.get("/analytics", authMiddleware, getAnalytics);

// Reports — Email delivery
router.post("/reports/email", authMiddleware, async (req, res) => {
  try {
    const { sendEmail } = require("../utils/sendEmail");
    const { Message } = require("../models/index");
    const { to, subject, htmlBody, moduleCode, departmentId } = req.body;
    
    if (!to || !subject || !htmlBody) {
      return res.status(400).json({ success: false, message: "Missing required fields: to, subject, htmlBody" });
    }
    
    const result = await sendEmail({
      to,
      subject: `[DRAVANUA HUB] ${subject}`,
      text: `Official Communication from DRAVANUA HUB. Scope: ${moduleCode || "DVS"}`,
      html: htmlBody,
    });
    
    if (result.success) {
      // Archive the broadcast in the Message center so it "stays there" for reference
      try {
        await Message.create({
          senderName: "SYSTEM BROADCAST",
          senderEmail: req.user.email || "broadcast@dravanuahub.com",
          senderId: req.user.id,
          subject: subject,
          content: `OUTBOUND BROADCAST:\n\n${htmlBody.replace(/<[^>]*>?/gm, '')}`, // Strip tags for text content
          isRead: true,
          status: 'replied',
          replied: true,
          departmentId: departmentId || null, // Map to specific department if provided
          category: moduleCode || 'Broadcast'
        });
      } catch (logErr) {
        console.warn("Failed to archive broadcast in DB:", logErr.message);
      }
      
      res.json({ success: true, message: `Report sent to ${to} successfully.` });
    } else {
      res.status(500).json({ success: false, message: result.error || "Email delivery failed." });
    }
  } catch (error) {
    console.error("Report Email Error:", error);
    res.status(500).json({ success: false, message: "Server error sending report email." });
  }
});

// Financial Management
router.get("/finance", authMiddleware, getTransactions);
router.post("/finance", authMiddleware, isSuperAdmin, createTransaction);
router.put("/finance/:id", authMiddleware, isSuperAdmin, updateTransaction);
router.delete("/finance/:id", authMiddleware, isSuperAdmin, deleteTransaction);

// User Management (Super Admin only for mutations)
router.get("/users", authMiddleware, getUsers);
router.post("/users", authMiddleware, isSuperAdmin, createUser);
router.post("/users/:id/resend-code", authMiddleware, isSuperAdmin, resendCode);
router.put("/users/:id", authMiddleware, isSuperAdmin, updateUser);
router.delete("/users/:id", authMiddleware, isSuperAdmin, deleteUser);

// Module Management (Super Admin only)
router.get("/modules", authMiddleware, isSuperAdmin, getModules);
router.put("/modules/:id", authMiddleware, isSuperAdmin, updateModule);

// Performance & Tracking
router.get("/performance", authMiddleware, isSuperAdmin, getPerformanceStats);
router.post(
  "/performance/report/:userId",
  authMiddleware,
  isSuperAdmin,
  sendUserActivityReport,
);
router.get("/attendance", authMiddleware, getAttendance);
router.post("/clock-in", authMiddleware, clockIn);
router.post("/clock-out", authMiddleware, clockOut);
router.patch("/attendance/:id/verify", authMiddleware, isSuperAdmin, verifyAttendance);

// Department Configuration
router.get("/departments", authMiddleware, getDepartments);

// Marketing Assets Management
router.get("/marketing", authMiddleware, getMarketingAssets);
router.post("/marketing", authMiddleware, createMarketingAsset);
router.put("/marketing/:id", authMiddleware, updateMarketingAsset);
router.delete("/marketing/:id", authMiddleware, deleteMarketingAsset);

// Gallery Management
router.get("/gallery", authMiddleware, getGallery);
router.post("/gallery", authMiddleware, isSuperAdmin, createGalleryItem);
router.put("/gallery/:id", authMiddleware, isSuperAdmin, updateGalleryItem);
router.delete("/gallery/:id", authMiddleware, isSuperAdmin, deleteGalleryItem);

// Message Management
router.get("/messages", authMiddleware, getMessages);
router.put("/messages/:id/reply", authMiddleware, isSuperAdmin, replyToMessage);

// Customer Management
router.get("/customers", authMiddleware, getCustomers);
router.post("/customers", authMiddleware, createCustomer);
router.put("/customers/:id", authMiddleware, updateCustomer);
router.delete("/customers/:id", authMiddleware, isSuperAdmin, deleteCustomer);

// Booking Management
router.get("/bookings", authMiddleware, getBookings);
router.post("/bookings", authMiddleware, upload.single("receipt"), createBooking);
router.put("/bookings/:id", authMiddleware, upload.single("receipt"), updateBooking);
router.delete("/bookings/:id", authMiddleware, deleteBooking);

// Team Management
router.delete("/team/:id", authMiddleware, isSuperAdmin, deleteTeamMember);

// Partner & Collaboration Management
router.get("/partners", authMiddleware, getPartners);
router.post("/partners", authMiddleware, isSuperAdmin, createPartner);
router.put("/partners/:id", authMiddleware, isSuperAdmin, updatePartner);
router.delete("/partners/:id", authMiddleware, isSuperAdmin, deletePartner);

// GPS & Location Settings
router.get("/office-location", authMiddleware, getOfficeLocation);
router.get("/office-locations", authMiddleware, getOfficeLocations);
router.put(
  "/office-location",
  authMiddleware,
  isSuperAdmin,
  updateOfficeLocation,
);

// Dropbox Integration & Vault
router.get("/dropbox/list", authMiddleware, getDropboxFiles);
router.post(
  "/dropbox/upload",
  authMiddleware,
  upload.single("file"),
  uploadToDropbox,
);

// Secure Receipts & Document Module
router.get("/receipts", authMiddleware, getReceipts);
router.post("/receipts", authMiddleware, upload.single("receipt_file"), uploadReceipt);
router.put("/receipts/:id", authMiddleware, updateReceipt);
router.patch("/receipts/:id/approve", authMiddleware, approveReceipt);
router.delete("/receipts/:id", authMiddleware, deleteReceipt);

// Contract Management
router.post(
  "/contracts/send",
  authMiddleware,
  require("../controllers/adminController").sendContract,
);

// Daily Operations Management
const dailyOpsRoutes = require("./dailyOpsRoutes");
router.use("/", authMiddleware, dailyOpsRoutes);

// Subscription Management
const subscriptionRoutes = require("./subscriptionRoutes");
router.use("/subscriptions", authMiddleware, subscriptionRoutes);

// Reminder / Schedule / Plan Management
const reminderRoutes = require("./reminderRoutes");
router.use("/reminders", authMiddleware, reminderRoutes);

// Item / Service Management
const itemRoutes = require("./itemRoutes");
router.use("/items", authMiddleware, itemRoutes);

module.exports = router;
