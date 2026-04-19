const {
  AdminUser,
  ServiceModule,
  ActivityLog,
  Message,
  Gallery,
  Attendance,
  Customer,
  Booking,
  Transaction,
  MarketingAsset,
  DailyReport,
  Expense,
  Purchase,
  OfficeLocation,
  DailyRequest,
  LocationHistory,
  Department,
  TeamMember,
} = require("../models/index");
const jwt = require("jsonwebtoken");
const { sendEmail } = require("../utils/sendEmail");
const crypto = require("crypto");

const multer = require("multer");
const path = require("path");

// Multer Config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname.replace(/\s+/g, "_")}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase(),
    );
    const mimetype = filetypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error("Images only (jpg, jpeg, png, webp)!"));
  },
});

// Helper to log user actions
const logAction = async (user, action, module, details = "") => {
  try {
    await ActivityLog.create({
      userId: user.id,
      userName: user.name,
      departmentId: user.departmentId,
      action,
      module,
      details,
    });
  } catch (error) {
    console.error("Activity logging failed:", error);
  }
};

// POST /api/v1/admin/login — Admin login
// Helper for Distance Calculation (Haversine Formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3; // metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
};

const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    const user = await AdminUser.findOne({ where: { email } });
    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: "Account disabled" });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    // Generate Access Token (Short: 15min)
    const accessToken = jwt.sign(
      { id: user.id, name: user.name, role: user.role, departmentId: user.departmentId },
      process.env.JWT_SECRET || "dravanua-access-secret",
      { expiresIn: "15m" }
    );

    // Generate Refresh Token (Long: 7 days)
    const refreshToken = jwt.sign(
      { id: user.id },
      process.env.JWT_REFRESH_SECRET || "dravanua-refresh-secret",
      { expiresIn: "7d" }
    );

    // Store refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    // Set HttpOnly Cookie
    res.cookie("refreshToken", refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.json({
      success: true,
      token: accessToken, // Frontend still uses 'token' key
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed" });
  }
};

// POST /api/v1/admin/refresh
const adminRefresh = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (!token) return res.status(401).json({ error: "No refresh token" });

    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET || "dravanua-refresh-secret");
    const user = await AdminUser.findByPk(decoded.id);

    if (!user || user.refreshToken !== token) {
      return res.status(403).json({ error: "Token mismatch or revoked" });
    }

    // Generate new Access Token
    const accessToken = jwt.sign(
      { id: user.id, name: user.name, role: user.role, departmentId: user.departmentId },
      process.env.JWT_SECRET || "dravanua-access-secret",
      { expiresIn: "15m" }
    );

    res.json({ success: true, token: accessToken });
  } catch (error) {
    res.status(403).json({ error: "Invalid refresh token" });
  }
};

// POST /api/v1/admin/logout
const adminLogout = async (req, res) => {
  try {
    const token = req.cookies.refreshToken;
    if (token) {
      const user = await AdminUser.findOne({ where: { refreshToken: token } });
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }
    res.clearCookie("refreshToken");
    res.json({ success: true, message: "Logged out" });
  } catch (error) {
    res.status(500).json({ error: "Logout failed" });
  }
};

// POST /api/v1/admin/seed — Create default super admin user & modules
const seedAdmin = async (req, res) => {
  try {
    // 1. Seed Super Admin (Support both domains for ease of use)
    const emails = ["admin@dravanuahub.com", "admin@dravanua.com"];
    let createdCount = 0;

    // Super Admin auto-provisioning was removed for security purposes.
    // Ensure administrators are created securely via proper channels.

    // 2. Seed Modules
    const modules = [
      {
        slug: "studio",
        name: "Studio Photography",
        description: "Photo sessions & packages",
      },
      {
        slug: "Stationery & Office Supplies",
        name: "Stationery & Office Supplies",
        description: "Office & School supplies",
      },
      {
        slug: "Flower Gifts",
        name: "Flower Gifts & Decoration",
        description: "Floral designs & arrangements",
      },
      {
        slug: "Classic Fashion",
        name: "Classic Fashion Styling",
        description: "Dressing & event coordination",
      },
    ];

    for (const mod of modules) {
      const exists = await ServiceModule.findOne({ where: { slug: mod.slug } });
      if (!exists) {
        await ServiceModule.create(mod);
      }
    }

    // 3. Seed Initial Gallery Inventory
    const galleryItems = [
      {
        title: "Birthday Bash Session",
        category: "Studio",
        description:
          "Professional studio photography for unforgettable celebrations.",
        imageUrl:
          "https://images.unsplash.com/photo-1530103043960-ef38714abb15?auto=format&fit=crop&q=80&w=800",
      },
      {
        title: "Executive Stationery & Office Supplies Kit",
        category: "Stationery & Office Supplies",
        description:
          "Premium leather-bound notebooks and handcrafted Stationery & Office Supplies.",
        imageUrl:
          "https://images.unsplash.com/photo-1586075010633-2442dc3d8c8f?auto=format&fit=crop&q=80&w=800",
      },
      {
        title: "Grand Ceremony Arch",
        category: "Classic Fashion",
        description:
          "Exquisite white floral arches designed for modern luxury Classic Fashions.",
        imageUrl:
          "https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&q=80&w=800",
      },
      {
        title: "Signature Organic Vase",
        category: "Flower Gifts",
        description: "Custom-designed floral art in artisanal stone vessels.",
        imageUrl:
          "https://images.unsplash.com/photo-1526047932273-341f2a7631f9?auto=format&fit=crop&q=80&w=800",
      },
    ];

    for (const item of galleryItems) {
      await Gallery.findOrCreate({
        where: { title: item.title },
        defaults: item,
      });
    }

    res.status(201).json({
      success: true,
      message:
        "Professional system initialization complete. All departments are live with starter inventories.",
      createdCount,
    });
  } catch (error) {
    console.error("❌ Seed error:", error.message);
    res.status(500).json({
      error: "Failed to initialize system",
      details: error.message,
    });
  }
};

// ===== USER MANAGEMENT (Super Admin Only) =====

const getUsers = async (req, res) => {
  try {
    let where = {};

    // If not super admin, filter by department but also include super admins so they can communicate
    if (req.user.role !== "super_admin" && req.user.departmentId) {
      const { Op } = require("sequelize");
      where = {
        [Op.or]: [
          { departmentId: req.user.departmentId },
          { role: "super_admin" },
        ],
      };
    }

    const users = await AdminUser.findAll({
      where,
      attributes: { exclude: ["password", "confirmationToken"] },
      include: [
        { model: Department, attributes: ["id", "name", "code"] },
      ],
      order: [
        ["role", "ASC"], // Super admins first
        ["name", "ASC"],
      ],
    });
    res.json({ success: true, data: users });
  } catch (error) {
    console.error("Fetch Users Error:", error);
    res.status(500).json({ error: "Failed to fetch users", details: error.message });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, role, departmentId } = req.body;

    const existing = await AdminUser.findOne({ where: { email } });
    if (existing) return res.status(400).json({ error: "User already exists" });

    // Generate 6-digit registration code
    const regCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    const user = await AdminUser.create({
      name,
      email,
      role,
      departmentId,
      registrationCode: regCode,
      registrationCodeExpires: expires,
      isEmailConfirmed: false,
      isActive: true,
    });

    // Send invitation email
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const signupUrl = `${frontendUrl}/admin/signup?email=${email}&code=${regCode}`;

    await sendEmail({
      to: email,
      subject: "Welcome to DRAVANUA HUB - Complete Your Registration",
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
      <div style="background: #1B5E20; padding: 20px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px;">DRAVANUA HUB</h1>
        <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">Account Activation</p>
      </div>
      <div style="padding: 30px; line-height: 1.6; color: #333;">
        <h2 style="color: #1B5E20; margin-top: 0;">Welcome, ${name}!</h2>
        <p>Thank you for joining DRAVANUA HUB. We're excited to have you on our team!</p>
        
        <p>Your administrative account has been created successfully. To complete your registration and activate your account, please consult your **System Administrator** or **Manager** to receive your unique activation code.</p>
        
        <div style="background: #fdf2f2; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px dashed #ef4444; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #b91c1c; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">🔐 Secure Access Protocol</p>
          <p style="margin: 10px 0 0; color: #7f1d1d; font-size: 15px; font-weight: 700;">"Your Manager will provide your unique Authorization Code separately for security purposes."</p>
        </div>

        <div style="text-align: center; margin: 30px 0;">
          <a href="${signupUrl}" style="background: #1B5E20; color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; display: inline-block; box-shadow: 0 2px 4px rgba(27, 94, 32, 0.2);">
            Complete Registration
          </a>
        </div>

        <div style="background: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
            <strong>What's Next?</strong><br/>
            1. Click the button above to open the registration page<br/>
            2. Enter your email and the activation code<br/>
            3. Create a secure password for your account<br/>
            4. Start using DRAVANUA HUB services
          </p>
        </div>

        <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 5px; margin: 20px 0;">
          <p style="margin: 0; font-size: 12px; color: #856404;">
            ⚠️ If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${signupUrl}" style="color: #856404; word-break: break-all; font-size: 11px;">${signupUrl}</a>
          </p>
        </div>
        
        <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
          If you have any questions or need assistance, please contact your system administrator.
        </p>
      </div>
      <div style="background: #f4f4f4; padding: 15px; text-align: center; color: #888; font-size: 12px;">
        <p style="margin: 5px 0;">DRAVANUA HUB • Here to Create</p>
        <p style="margin: 5px 0;">Kigali, Rwanda</p>
        <p style="margin: 10px 0 5px; font-size: 11px; color: #aaa;">
          This is an automated invitation from DRAVANUA HUB.
        </p>
      </div>
    </div>
  `,
      text: `Welcome to DRAVANUA HUB, ${name}!\n\nYour account has been provisioned. For security reasons, your Activation Code will be shared with you manually by your Manager.\n\nClick here to complete your registration once you have the code: ${signupUrl}\n\nBest regards,\nDRAVANUA HUB Team\nKigali, Rwanda`,
    });

    res
      .status(201)
      .json({ success: true, registrationCode: regCode, data: user });
  } catch (error) {
    console.error("User creation error:", error);
    res.status(500).json({ error: "Failed to create user: " + error.message });
  }
};

const resendCode = async (req, res) => {
  try {
    const user = await AdminUser.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    // Generate NEW 6-digit registration code
    const regCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins

    user.registrationCode = regCode;
    user.registrationCodeExpires = expires;
    await user.save();

    // Send invitation email (re-using template)
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const confirmUrl = `${frontendUrl}/admin/signup?email=${user.email}&code=${regCode}`;

    await sendEmail({
      to: user.email,
      subject: "New Activation Code - DRAVANUA HUB",
      html: `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
      <div style="background: #1B5E20; padding: 20px; text-align: center; color: white;">
        <h1 style="margin: 0; font-size: 24px;">DRAVANUA HUB</h1>
      </div>
      <div style="padding: 30px; line-height: 1.6; color: #333;">
        <h2 style="color: #1B5E20; margin-top: 0;">Hello, ${user.name}!</h2>
        <p>A new activation code has been generated for your administrative account. For security reasons, this code will not be sent via email.</p>
        
        <div style="background: #fdf2f2; padding: 20px; border-radius: 8px; margin: 25px 0; border: 1px dashed #ef4444; text-align: center;">
          <p style="margin: 0; font-size: 14px; color: #b91c1c; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px;">🔐 Secure Access Protocol</p>
          <p style="margin: 10px 0 0; color: #7f1d1d; font-size: 15px; font-weight: 700;">"Your Manager will provide your NEW Authorization Code separately."</p>
        </div>

        <p>Click the link below to activate your account once you receive the code from your manager:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}" style="background: #1B5E20; color: white; padding: 12px 25px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Proceed to Activation</a>
        </div>
      </div>
      <div style="background: #f4f4f4; padding: 15px; text-align: center; color: #888; font-size: 12px;">
        DRAVANUA HUB • Here to Create • Kigali, Rwanda
      </div>
    </div>
  `,
    });

    res.json({ success: true, registrationCode: regCode });
  } catch (error) {
    res.status(500).json({ error: "Failed to resend code: " + error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const user = await AdminUser.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const oldStatus = user.isActive;
    await user.update(req.body);

    // Notify user if status changed
    if (req.body.isActive !== undefined && req.body.isActive !== oldStatus) {
      const statusText = req.body.isActive ? "ENABLED" : "DISABLED";
      const detailText = req.body.isActive
        ? "Your account has been reactivated. You can now access the DRAVANUA HUB system."
        : "Your account has been disabled or your session has been ended by the administrator. Access is restricted.";

      await sendEmail({
        to: user.email,
        subject: `[DRAVANUA HUB] Account Access Update: ${statusText}`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #2d5a27;">Hello ${user.name},</h2>
            <p style="font-size: 16px; color: #444;">${detailText}</p>
            <p style="font-size: 14px; color: #888;">If you believe this is an error, please contact the Super Admin.</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #aaa;">DRAVANUA STUDIO - Fine Art & Design</p>
          </div>
        `,
      });

      await logAction(
        req.user,
        "ACCESS_CHANGE",
        "USER_MGMT",
        `Changed status of ${user.name} to ${statusText}`,
      );
      
      // Auto-update associated TeamMember profile visibility
      if (req.body.isActive === false) {
        const teamMember = await TeamMember.findOne({ where: { adminUserId: user.id } });
        if (teamMember) {
          await teamMember.update({ isHired: false });
        }
      }
    }

    res.json({ success: true, data: user });
  } catch (error) {
    res.status(500).json({ error: "Failed to update user" });
  }
};

const deleteUser = async (req, res) => {
  try {
    const user = await AdminUser.findByPk(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    
    // Also delete associated public profile
    await TeamMember.destroy({ where: { adminUserId: user.id } });
    
    await user.destroy();
    res.json({ success: true, message: "User deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete user" });
  }
};

const confirmEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const user = await AdminUser.findOne({
      where: { confirmationToken: token },
    });
    if (!user) return res.status(400).send("Invalid token");
    await user.update({ isEmailConfirmed: true, confirmationToken: null });
    res.send("<h1>Account Confirmed! 🌿</h1><p>You can now login.</p>");
  } catch (error) {
    res.status(500).send("Error");
  }
};

// ===== MODULE MANAGEMENT (Super Admin Only) =====

const getModules = async (req, res) => {
  try {
    const modules = await ServiceModule.findAll();
    res.json({ success: true, data: modules });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch modules" });
  }
};

const updateModule = async (req, res) => {
  try {
    const mod = await ServiceModule.findByPk(req.params.id);
    if (!mod) return res.status(404).json({ error: "Module not found" });
    await mod.update(req.body);
    res.json({ success: true, data: mod });
  } catch (error) {
    res.status(500).json({ error: "Failed to update module" });
  }
};

// GET /api/v1/admin/performance
const getPerformanceStats = async (req, res) => {
  try {
    const logs = await ActivityLog.findAll({
      include: [{ model: Department, attributes: ["id", "name"] }],
      order: [["createdAt", "DESC"]],
      limit: 200,
    });

    const allDepartments = await Department.findAll({ where: { isActive: true } });
    const transactions = await Transaction.findAll();

    // Grouping logic for stats by User
    const statsByUser = {};
    logs.forEach((log) => {
      const deptName = log.Department ? log.Department.name : "GENERAL";
      if (!statsByUser[log.userId]) {
        statsByUser[log.userId] = {
          userId: log.userId,
          name: log.userName,
          department: deptName,
          totalActions: 0,
          income: 0,
          expenses: 0,
          sales: 0,
          actions: [],
        };
      }
      statsByUser[log.userId].totalActions += 1;
      statsByUser[log.userId].actions.push({
        action: log.action,
        module: log.module,
        time: log.createdAt,
      });
    });

    // Add financial stats per user from transactions
    transactions.forEach((t) => {
      const uId = t.userId;
      if (uId && statsByUser[uId]) {
        const amt = parseFloat(t.amount || 0);
        if (t.type === "Sale") {
          statsByUser[uId].income += amt;
          statsByUser[uId].sales += 1;
        } else if (t.type === "Expense") {
          statsByUser[uId].expenses += amt;
        }
      }
    });

    // Departmental Aggregation
    const deptStats = allDepartments.map((dept) => {
      const deptLogs = logs.filter((l) => l.departmentId === dept.id);
      const deptTrans = transactions.filter((t) => t.departmentId === dept.id);

      const income = deptTrans
        .filter((t) => t.type === "Sale")
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
      const expenses = deptTrans
        .filter((t) => t.type === "Expense")
        .reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);

      return {
        id: dept.id,
        name: dept.name,
        code: dept.code,
        totalActions: deptLogs.length,
        income,
        expenses,
        staffCount: [...new Set(deptLogs.map((l) => l.userId))].length,
      };
    });

    res.json({
      success: true,
      data: Object.values(statsByUser),
      deptStats,
      rawLogs: logs.map((l) => {
        const logData = l.toJSON();
        return {
          ...logData,
          department: l.Department ? l.Department.name : "GENERAL",
        };
      }),
    });
  } catch (error) {
    console.error("Performance Stats Error:", error);
    res.status(500).json({ error: "Failed to fetch performance stats" });
  }
};

// POST /api/v1/admin/performance/report/:userId
const sendUserActivityReport = async (req, res) => {
  try {
    const { userId } = req.params;
    const user = await AdminUser.findByPk(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const logs = await ActivityLog.findAll({
      where: { userId },
      order: [["createdAt", "DESC"]],
      limit: 50,
    });

    const attendance = await Attendance.findAll({
      where: { userId },
      order: [["date", "DESC"]],
      limit: 10,
    });

    const reportHtml = `
      <div style="font-family: sans-serif; padding: 25px; color: #333; border: 1px solid #eee; border-radius: 15px; max-width: 800px; margin: auto;">
        <div style="display: flex; align-items: center; gap: 20px; border-bottom: 3px solid #2d5a27; padding-bottom: 20px;">
          <div style="background: #2d5a27; color: white; width: 60px; height: 60px; border-radius: 12px; display: flex; align-items: center; justifyContent: center; font-weight: bold; font-size: 24px;">DV</div>
          <div>
            <h1 style="margin: 0; color: #2d5a27;">DRAVANUA HUB</h1>
            <p style="margin: 0; color: #666;">Executive Performance Intelligence Report</p>
          </div>
        </div>

        <div style="margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div>
            <p style="margin: 5px 0;"><strong>Staff Member:</strong> ${user.name}</p>
            <p style="margin: 5px 0;"><strong>Department:</strong> ${user.departmentId}</p>
            <p style="margin: 5px 0;"><strong>Role:</strong> ${user.role}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 5px 0;"><strong>Report Date:</strong> ${new Date().toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${user.isActive ? "#2d5a27" : "#d32f2f"};">${user.isActive ? "ACTIVE" : "DISABLED"}</span></p>
          </div>
        </div>

        <h3 style="margin-top: 40px; color: #2d5a27; border-left: 4px solid #2d5a27; padding-left: 10px;">Operational Chronology (Recent 50 Actions)</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 12px; border: 1px solid #eee; text-align: left;">Timestamp</th>
              <th style="padding: 12px; border: 1px solid #eee; text-align: left;">Action</th>
              <th style="padding: 12px; border: 1px solid #eee; text-align: left;">Mission Details</th>
            </tr>
          </thead>
          <tbody>
            ${
              logs.length > 0
                ? logs
                    .map(
                      (log) => `
              <tr>
                <td style="padding: 10px; border: 1px solid #eee; color: #666;">${new Date(log.createdAt).toLocaleString()}</td>
                <td style="padding: 10px; border: 1px solid #eee;"><span style="background: #e8f5e9; color: #2d5a27; padding: 3px 8px; border-radius: 5px; font-weight: bold; font-size: 10px;">${log.action}</span></td>
                <td style="padding: 10px; border: 1px solid #eee;">${log.details}</td>
              </tr>
            `,
                    )
                    .join("")
                : '<tr><td colspan="3" style="padding: 20px; text-align: center; color: #999;">No activity logged for this period.</td></tr>'
            }
          </tbody>
        </table>

        <h3 style="margin-top: 40px; color: #2d5a27; border-left: 4px solid #2d5a27; padding-left: 10px;">Attendance Matrix (Last 10 Logs)</h3>
        <table style="width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 13px;">
          <thead>
            <tr style="background: #f8f9fa;">
              <th style="padding: 12px; border: 1px solid #eee; text-align: left;">Date</th>
              <th style="padding: 12px; border: 1px solid #eee; text-align: left;">Clock In</th>
              <th style="padding: 12px; border: 1px solid #eee; text-align: left;">Clock Out</th>
              <th style="padding: 12px; border: 1px solid #eee; text-align: left;">Total Productivity</th>
            </tr>
          </thead>
          <tbody>
            ${
              attendance.length > 0
                ? attendance
                    .map(
                      (att) => `
              <tr>
                <td style="padding: 10px; border: 1px solid #eee;">${att.date}</td>
                <td style="padding: 10px; border: 1px solid #eee;">${att.clockIn ? new Date(att.clockIn).toLocaleTimeString() : "N/A"}</td>
                <td style="padding: 10px; border: 1px solid #eee;">${att.clockOut ? new Date(att.clockOut).toLocaleTimeString() : "In Progress"}</td>
                <td style="padding: 10px; border: 1px solid #eee; font-weight: bold;">${att.totalHours || "0"} Operational Hours</td>
              </tr>
            `,
                    )
                    .join("")
                : '<tr><td colspan="4" style="padding: 20px; text-align: center; color: #999;">No attendance records found.</td></tr>'
            }
          </tbody>
        </table>

        <div style="margin-top: 50px; padding: 20px; background: #fdfdfd; border: 1px dashed #2d5a27; border-radius: 10px;">
          <p style="margin: 0; font-size: 14px; line-height: 1.6;"><strong>Executive Summary:</strong> This document serves as an official audit of staff performance within the DRAVANUA HUB enterprise system. The data captured above reflects real-time operational contributions and attendance consistency. This report is intended for administrative purposes only.</p>
        </div>

        <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; text-align: center; font-size: 11px; color: #aaa;">
          DRAVANUA STUDIO — Fine Art, Design & Creative Hub<br/>
          <em>"Here to Create"</em>
        </div>
      </div>
    `;

    await sendEmail({
      to: req.user.email,
      subject: `📊 [ACTIVITY REPORT] ${user.name} - ${new Date().toLocaleDateString()}`,
      html: reportHtml,
    });

    res.json({
      success: true,
      message: `Detailed activity report for ${user.name} has been dispatched to ${req.user.email}`,
    });
  } catch (error) {
    console.error("Report dispatch error:", error);
    res.status(500).json({ error: "Failed to dispatch report" });
  }
};

// --- ATTENDANCE CONTROLLERS ---
const getAttendance = async (req, res) => {
  try {
    const { date, departmentId } = req.query;
    let where = {};
    if (date) where.date = date;

    const attendance = await Attendance.findAll({
      where,
      include: [
        {
          model: AdminUser,
          attributes: ["id", "name", "departmentId", "email", "staffCode"],
        },
        {
          model: Department,
          attributes: ["name"],
        },
      ],
      order: [
        ["date", "DESC"],
        ["createdAt", "DESC"],
      ],
    });

    let filtered = attendance.map((a) => {
      const data = a.toJSON(); // Get plain object
      return {
        id: data.id,
        date: data.date,
        userId: data.userId,
        userName: data.AdminUser
          ? data.AdminUser.name
          : data.userName || "Unknown",
        staffCode: data.AdminUser ? data.AdminUser.staffCode : "N/A",
        uuid: data.AdminUser ? data.AdminUser.id : null,
        departmentId: data.departmentId,
        department: data.Department ? data.Department.name : (data.AdminUser && data.AdminUser.Department ? data.AdminUser.Department.name : "General"),
        clockIn: data.clockIn,
        clockOut: data.clockOut,
        totalHours: data.totalHours,
        status: data.status,
        gps_lat: data.gpsLat || data.gps_lat,
        gps_lon: data.gpsLon || data.gps_lon,
      };
    });

    // Role-based filtering
    if (req.user.role !== "super_admin") {
      filtered = filtered.filter((f) => f.userId === req.user.id);
    }

    if (departmentId) {
      filtered = filtered.filter((f) => f.departmentId === departmentId);
    }

    res.status(200).json({ success: true, data: filtered });
  } catch (error) {
    console.error("Attendance fetch error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance",
      details: error.message,
    });
  }
};

const clockIn = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const existing = await Attendance.findOne({
      where: { userId: req.user.id, date: today },
    });
    if (existing)
      return res
        .status(400)
        .json({ success: false, message: "Already clocked in today" });

    const { lat, lon, accuracy, altitude, speed, heading } = req.body;

    // Get Office Location for distance verification
    const office = await OfficeLocation.findOne({ where: { is_active: true } });
    
    if (!lat || !lon) {
      return res.status(400).json({ success: false, message: "GPS coordinates are required for attendance verification." });
    }

    const distanceToOffice = office
      ? calculateDistance(lat, lon, office.latitude, office.longitude)
      : null;

    if (office && distanceToOffice !== null) {
      const maxRadius = office.buffer_radius || office.allowed_radius || 150;
      if (distanceToOffice > maxRadius) {
        return res.status(403).json({ 
          success: false, 
          message: `Access Denied: You are ${Math.round(distanceToOffice)}m away from the office. The maximum allowed operating radius is ${maxRadius}m.` 
        });
      }
    }

    let userName = req.user.name;
    if (!userName) {
      const user = await AdminUser.findByPk(req.user.id);
      userName = user ? user.name : "Unknown Staff";
    }

    const record = await Attendance.create({
      userId: req.user.id,
      userName: userName,
      date: today,
      clockIn: new Date(),
      gpsLat: lat,
      gpsLon: lon,
      distanceFromOffice: distanceToOffice,
      status: "present",
    });

    // Save detailed GPS history
    await LocationHistory.create({
      userId: req.user.id,
      attendanceId: record.id,
      gpsLat: lat || 0,
      gpsLon: lon || 0,
      accuracy: accuracy || null,
      altitude: altitude || null,
      speed: speed || null,
      heading: heading || null,
      distanceFromOffice: distanceToOffice,
      actionType: "CLOCK_IN",
    });

    res.status(201).json({ success: true, data: record });
  } catch (error) {
    console.error("Clock-in error:", error);
    res.status(500).json({
      success: false,
      message: "Clock-in failed",
      details: error.message,
    });
  }
};

const clockOut = async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const record = await Attendance.findOne({
      where: { userId: req.user.id, date: today },
    });
    if (!record)
      return res
        .status(404)
        .json({ success: false, message: "No clock-in record found" });

    const { lat, lon, accuracy, altitude, speed, heading } = req.body;
    const cOut = new Date();
    const hours = (cOut - new Date(record.clockIn)) / (1000 * 60 * 60);

    // Calc distance
    const office = await OfficeLocation.findOne({ where: { is_active: true } });
    
    if (!lat || !lon) {
      return res.status(400).json({ success: false, message: "GPS coordinates are required for attendance verification." });
    }

    const distanceToOffice = office
      ? calculateDistance(lat, lon, office.latitude, office.longitude)
      : null;

    if (office && distanceToOffice !== null) {
      const maxRadius = office.buffer_radius || office.allowed_radius || 150;
      if (distanceToOffice > maxRadius) {
        return res.status(403).json({ 
          success: false, 
          message: `Access Denied: You are ${Math.round(distanceToOffice)}m away from the office. The maximum allowed operating radius is ${maxRadius}m.` 
        });
      }
    }

    await record.update({
      clockOut: cOut,
      gpsLat: lat || record.gpsLat,
      gpsLon: lon || record.gpsLon,
      distanceFromOffice: distanceToOffice || record.distanceFromOffice,
      totalHours: parseFloat(hours.toFixed(2)),
    });

    // Save detailed GPS history
    await LocationHistory.create({
      userId: req.user.id,
      attendanceId: record.id,
      gpsLat: lat || record.gpsLat || 0,
      gpsLon: lon || record.gpsLon || 0,
      accuracy: accuracy || null,
      altitude: altitude || null,
      speed: speed || null,
      heading: heading || null,
      distanceFromOffice: distanceToOffice,
      actionType: "CLOCK_OUT",
    });

    res.status(200).json({ success: true, data: record });
  } catch (error) {
    console.error("Clock-out error:", error);
    res.status(500).json({
      success: false,
      message: "Clock-out failed",
      details: error.message,
    });
  }
};

const getOfficeLocation = async (req, res) => {
  try {
    const location = await OfficeLocation.findOne({
      where: { is_active: true },
    });
    if (!location) {
      // Default to Kigali location if none exists
      return res.json({
        success: true,
        data: {
          office_name: "DRAVANUA HQ",
          latitude: -1.9441,
          longitude: 30.0619,
          allowed_radius: 100,
        },
      });
    }
    res.json({ success: true, data: location });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch office location" });
  }
};

const updateOfficeLocation = async (req, res) => {
  try {
    const { office_name, latitude, longitude, allowed_radius, country, city, address } = req.body;
    let location = await OfficeLocation.findOne({ where: { is_active: true } });

    if (location) {
      await location.update({
        office_name,
        latitude,
        longitude,
        allowed_radius,
        country,
        city,
        address
      });
    } else {
      location = await OfficeLocation.create({
        office_name,
        latitude,
        longitude,
        allowed_radius,
        country,
        city,
        address,
        is_active: true,
      });
    }

    res.json({
      success: true,
      message: "GPS configuration updated",
      data: location,
    });
  } catch (error) {
    res.status(500).json({ error: "Failed to update GPS configuration" });
  }
};

// --- GALLERY CONTROLLERS ---
const getGallery = async (req, res) => {
  try {
    const where = {};
    if (req.user.role !== "super_admin" && req.user.departmentId !== "all") {
      where.departmentId = req.user.departmentId;
    }
    const items = await Gallery.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });
    
    // Map imageUrl to image for frontend component compatibility
    const mappedItems = items.map(item => ({
       ...item.toJSON(),
       image: item.imageUrl
    }));

    res.status(200).json({ success: true, data: mappedItems });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch gallery" });
  }
};

const createGalleryItem = async (req, res) => {
  try {
    const data = {
      ...req.body,
      imageUrl: req.body.image, // Map frontend payload to Sequelize model
      userId: req.user.id, // Link to creator
    };

    // Resolve departmentId from category string if provided
    if (!data.departmentId && data.category) {
      data.departmentId = await Department.resolveId(data.category);
    }

    const item = await Gallery.create(data);
    await logAction(req.user, "CREATE", "Gallery", `Added ${item.title}`);
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to create gallery item" });
  }
};

const updateGalleryItem = async (req, res) => {
  try {
    const item = await Gallery.findByPk(req.params.id);
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    const updateData = {
      ...req.body,
      imageUrl: req.body.image || item.imageUrl
    };
    await item.update(updateData);
    await logAction(req.user, "UPDATE", "Gallery", `Updated ${item.title}`);
    res.status(200).json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

const deleteGalleryItem = async (req, res) => {
  try {
    const item = await Gallery.findByPk(req.params.id);
    if (!item)
      return res
        .status(404)
        .json({ success: false, message: "Item not found" });
    await item.destroy();
    res.status(200).json({ success: true, message: "Item deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};

// --- MESSAGE CONTROLLERS ---
const getMessages = async (req, res) => {
  try {
    const where = {};
    if (req.user.role !== "super_admin" && req.user.departmentId !== "all") {
      where.departmentId = req.user.departmentId;
    }
    const messages = await Message.findAll({
      where,
      order: [["createdAt", "DESC"]],
    });
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch messages" });
  }
};

const replyToMessage = async (req, res) => {
  try {
    const msg = await Message.findByPk(req.params.id);
    if (!msg)
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    await msg.update({
      replyContent: req.body.replyContent,
      status: "replied",
    });
    res.status(200).json({ success: true, data: msg });
  } catch (error) {
    res.status(500).json({ success: false, message: "Reply failed" });
  }
};

// --- CUSTOMER CONTROLLERS ---
const getCustomers = async (req, res) => {
  try {
    const customers = await Customer.findAll({
      order: [["createdAt", "DESC"]],
    });
    res.status(200).json({ success: true, data: customers });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch customers" });
  }
};
const createCustomer = async (req, res) => {
  try {
    const customerData = { ...req.body };
    if (req.user.role !== "super_admin" && req.user.departmentId !== "all") {
      customerData.departmentId = req.user.departmentId;
    }
    const customer = await Customer.create(customerData);
    await logAction(
      req.user,
      "CREATE",
      "CRM",
      `Added customer ${customer.name}`,
    );
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: "Registration failed" });
  }
};

const updateCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer)
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    await customer.update(req.body);
    await logAction(
      req.user,
      "UPDATE",
      "CRM",
      `Updated customer ${customer.name}`,
    );
    res.status(200).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

const deleteCustomer = async (req, res) => {
  try {
    const customer = await Customer.findByPk(req.params.id);
    if (!customer)
      return res
        .status(404)
        .json({ success: false, message: "Customer not found" });
    await customer.destroy();
    res.status(200).json({ success: true, message: "Customer deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};

// --- ANALYTICS CONTROLLER ---
// --- ANALYTICS CONTROLLER ---
const getAnalytics = async (req, res) => {
  try {
    const { period, start, end, departmentId, currency } = req.query;
    const { Subscription } = require("../models");
    const now = new Date();

    // ── ROLE-BASED ACCESS CONTROL ────────────────────────────────────────────
    // Determine the caller's privilege level from the JWT
    const callerRole       = req.user.role;       // 'super_admin' | 'service_admin' | 'user'
    const callerDeptId     = req.user.departmentId;
    const isPrivileged     = callerRole === 'super_admin' || callerRole === 'service_admin';
    const isSuperAdmin     = callerRole === 'super_admin';

    // Normal users (role='user') or service_admin without super privileges:
    //   • See today only
    //   • See their department only
    // super_admin: no restrictions — full access to all periods and departments.
    let startDate = null;
    let effectiveDeptId = departmentId || null;  // query param default

    if (!isSuperAdmin) {
      // Enforce today-only for non-super-admin roles
      const todayStart = new Date(now);
      todayStart.setHours(0, 0, 0, 0);
      startDate = todayStart;

      // Enforce department scope: normal users can ONLY see their own dept
      if (callerRole === 'user') {
        effectiveDeptId = callerDeptId || effectiveDeptId;
      }
      // service_admin: can see all departments (within today only)
    } else {
      // super_admin: honour query params as usual
      if (start && end) {
        startDate = new Date(start);
      } else if (period === '7d') {
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (period === '30d') {
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      }
      effectiveDeptId = departmentId || null;
    }
    // ────────────────────────────────────────────────────────────────────────

    const endDate =
      start && end && isSuperAdmin
        ? new Date(new Date(end).setHours(23, 59, 59, 999))
        : new Date(now.setHours(23, 59, 59, 999));

    const dateRange = startDate
      ? { [require('sequelize').Op.between]: [startDate, endDate] }
      : {};

    const attendance = await Attendance.findAll({
      where: startDate
        ? { date: { [require('sequelize').Op.gte]: startDate.toISOString().split('T')[0] } }
        : {},
    });

    const dateWhere = startDate ? { createdAt: dateRange } : {};

    // Base filters — department scoping
    const baseWhere = {};
    if (effectiveDeptId) {
      baseWhere.departmentId = effectiveDeptId;
    } else if (!isSuperAdmin && callerDeptId) {
      baseWhere.departmentId = callerDeptId;
    }

    const customers = await Customer.findAll({
      where: startDate
        ? { createdAt: { [require("sequelize").Op.gte]: startDate } }
        : {},
    });
    const landingWhere = { ...baseWhere, ...dateWhere };
    if (currency && currency !== "all") {
      landingWhere.currency = currency;
    }

    const transWhere = { ...dateWhere };
    if (effectiveDeptId) {
      transWhere.departmentId = effectiveDeptId;
    } else if (!isSuperAdmin && callerDeptId) {
      transWhere.departmentId = callerDeptId;
    }
    if (currency && currency !== "all") {
      transWhere.currency = currency;
    }

    const opsWhere = { ...dateWhere };
    if (currency && currency !== "all") {
      opsWhere.currency = currency;
    }

    const transactions = await Transaction.findAll({ where: transWhere });
    const bookings = await Booking.findAll({
      where: landingWhere,
      include: [{ model: Customer, attributes: ["id", "name", "email"] }],
    });
    const dailyOpsReports = await DailyReport.findAll({ where: opsWhere });
    const dailyOpsExpenses = await Expense.findAll({ where: opsWhere });
    const dailyOpsPurchases = await Purchase.findAll({ where: opsWhere });
    const subscriptions = await Subscription.findAll({ where: { status: 'Active' } });

    // Calculate recurring subscription burn
    let subscriptionBurn = 0;
    subscriptions.forEach(s => {
      const cost = parseFloat(s.cost) || 0;
      if (s.billingCycle === 'Weekly') subscriptionBurn += cost * 4;
      else if (s.billingCycle === 'Monthly') subscriptionBurn += cost;
      else if (s.billingCycle === 'Quarterly') subscriptionBurn += cost / 3;
      else if (s.billingCycle === 'Yearly') subscriptionBurn += cost / 12;
    });

    // 1. Sales & Income Statistics
    const incomeStats = {
      revenue:
        transactions
          .filter((t) => t.type === "Sale")
          .reduce((sum, t) => sum + (t.amount || 0), 0) +
        dailyOpsReports.reduce(
          (sum, r) => sum + (parseFloat(r.totalPrice) || 0),
          0,
        ),
      expenses:
        transactions
          .filter((t) => t.type === "Expense")
          .reduce((sum, t) => sum + (t.amount || 0), 0) +
        dailyOpsExpenses.reduce(
          (sum, e) => sum + (parseFloat(e.totalPrice) || 0),
          0,
        ) +
        dailyOpsPurchases.reduce(
          (sum, p) => sum + (parseFloat(p.totalPrice) || 0),
          0,
        ) +
        subscriptionBurn,
      bookingsCount: bookings.length,
      subscriptionBurn,
      pendingRevenue:
        bookings
          .filter((b) => b.status === "pending")
          .reduce((sum, b) => sum + (parseFloat(b.totalAmount) || 0), 0),
      pendingCount: bookings.filter((b) => b.status === "pending").length,
    };

    // 2. Attendance & Productivity Map
    const staffMap = {};
    attendance.forEach((att) => {
      const name = att.userName || "Unknown";
      if (!staffMap[name])
        staffMap[name] = {
          name,
          workingDays: new Set(),
          clients: new Set(),
          income: 0,
          actions: 0,
        };
      staffMap[name].workingDays.add(att.date);
    });

    bookings.forEach((b) => {
      const staffName = b.handledByAdminName || "System";
      if (!staffMap[staffName])
        staffMap[staffName] = {
          name: staffName,
          workingDays: new Set(),
          clients: new Set(),
          income: 0,
          actions: 0,
        };
      // 3NF: Fetch from customer association
      const clientIdentifier = b.Customer
        ? b.Customer.email || b.Customer.name
        : "Guest";
      staffMap[staffName].clients.add(clientIdentifier);
      staffMap[staffName].actions++;
    });

    // Track income from sales
    transactions
      .filter((t) => t.type === "Sale")
      .forEach((t) => {
        const staffName = t.recordedBy || "System";
        if (!staffMap[staffName])
          staffMap[staffName] = {
            name: staffName,
            workingDays: new Set(),
            clients: new Set(),
            income: 0,
            actions: 0,
          };
        staffMap[staffName].income += t.amount || 0;
        staffMap[staffName].actions++;
      });

    // Track income from Daily Reports
    dailyOpsReports.forEach((r) => {
      const staffName = r.createdBy || "System";
      if (!staffMap[staffName])
        staffMap[staffName] = {
          name: staffName,
          workingDays: new Set(),
          clients: new Set(),
          income: 0,
          actions: 0,
        };
      staffMap[staffName].income += parseFloat(r.totalPrice) || 0;
      staffMap[staffName].actions++;
    });

    const employeeRates = Object.values(staffMap)
      .map((s) => {
        const days = s.workingDays.size || 1;
        return {
          name: s.name,
          workingDays: s.workingDays.size,
          clientsServed: s.clients.size,
          incomeGenerated: s.income,
          totalActions: s.actions,
          efficiency: s.actions > 0 ? (s.income / s.actions).toFixed(2) : 0,
          incomePerDay: (s.income / days).toFixed(2),
        };
      })
      .sort((a, b) => b.incomeGenerated - a.incomeGenerated);

    // 3. Special Clients
    const customerMap = {};
    bookings.forEach((b) => {
      if (b.Customer) {
        const email = b.Customer.email;
        if (!customerMap[email])
          customerMap[email] = {
            name: b.Customer.name,
            count: 0,
            total: 0,
          };
        customerMap[email].count++;
        customerMap[email].total += parseFloat(b.totalAmount) || 0;
      }
    });
    const specialClients = Object.values(customerMap)
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);

    // 4. Departmental breakdown
    const deptNames = await Department.getNameMap();
    const categoryRevenue = {};
    Object.values(deptNames).forEach((name) => {
      categoryRevenue[name] = 0;
    });
    categoryRevenue["Other"] = 0;

    transactions
      .filter((t) => t.type === "Sale")
      .forEach((t) => {
        // Map integer departmentId back to name for grouping
        const cat = deptNames[t.departmentId] || "Other";
        if (categoryRevenue[cat] !== undefined)
          categoryRevenue[cat] += parseFloat(t.amount) || 0;
        else categoryRevenue.Other += parseFloat(t.amount) || 0;
      });

    dailyOpsReports.forEach((r) => {
      const cat = deptNames[r.departmentId] || "Other";
      if (categoryRevenue[cat] !== undefined)
        categoryRevenue[cat] += parseFloat(r.totalPrice) || 0;
      else categoryRevenue.Other += parseFloat(r.totalPrice) || 0;
    });

    res.status(200).json({
      success: true,
      data: {
        incomeStats,
        specialClients,
        employeeRates,
        categoryRevenue,
        summary: {
          period: period || "all",
          totalRevenue: incomeStats.revenue,
          netProfit: incomeStats.revenue - incomeStats.expenses,
          totalCustomers: customers.length,
          totalBookings: bookings.length,
          workingDaysCount: attendance.length,
          operationalExpenses: incomeStats.expenses,
          subscriptionBurn: incomeStats.subscriptionBurn,
          pendingRevenue: incomeStats.pendingRevenue,
          pendingCount: incomeStats.pendingCount,
          avgTicket: incomeStats.revenue / Math.max(transactions.length + bookings.length, 1),
          operationalStability: (incomeStats.revenue / Math.max(incomeStats.expenses, 1)).toFixed(2),
          yieldPercentage: incomeStats.revenue > 0 ? ((incomeStats.revenue - incomeStats.expenses) / incomeStats.revenue * 100).toFixed(1) : 0,
        },
        // Inform the frontend what scope was applied
        accessScope: {
          role:       callerRole,
          scope:      isSuperAdmin ? 'full' : 'today',
          department: effectiveDeptId || callerDeptId || 'all',
          dateRange: {
            from: startDate ? startDate.toISOString().split('T')[0] : 'all-time',
            to:   endDate   ? endDate.toISOString().split('T')[0]   : new Date().toISOString().split('T')[0],
          },
        },
      },
    });
  } catch (error) {
    console.error("Analytics Error:", error);
    res.status(500).json({ success: false, message: "Analytics failed" });
  }
};
exports.getAnalytics = getAnalytics;

// --- FINANCIAL CONTROLLERS ---
const getTransactions = async (req, res) => {
  try {
    const { start, end, type } = req.query;
    let where = {};
    if (start && end) {
      where.date = {
        [require("sequelize").Op.between]: [new Date(start), new Date(end)],
      };
    }
    if (type) where.type = type;

    // Financial isolation
    if (req.user.role !== "super_admin" && req.user.departmentId !== "all") {
      where.departmentId = req.user.departmentId;
    }

    const transactions = await Transaction.findAll({
      where,
      order: [["date", "DESC"]],
    });
    res.status(200).json({ success: true, data: transactions });
  } catch (error) {
    console.error("Finance fetch error:", error);
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch financial data" });
  }
};
exports.getTransactions = getTransactions;

const createTransaction = async (req, res) => {
  try {
    const { 
      type, amount, category, paymentMethod, 
      client, description, date, currency,
      department_id, user_id, recorded_by,
      financialInstitution, accountNumber
    } = req.body;

    const transData = {
      type,
      amount,
      category,
      paymentMethod,
      client,
      description,
      date: date || new Date(),
      currency: currency || "RWF",
      userId: user_id || req.user.id,
      departmentId: department_id || null,
      recordedBy: recorded_by || req.user.name,
      financialInstitution,
      accountNumber
    };

    // Auto-resolve department ID if explicitly missing but category matches a department
    if (!transData.departmentId && transData.category) {
      transData.departmentId = await Department.resolveId(transData.category);
    }

    // Role-based security override for non-super-admins
    if (
      !transData.departmentId &&
      req.user.role !== "super_admin" &&
      req.user.departmentId !== "all"
    ) {
      transData.departmentId = req.user.departmentId;
    }

    const transaction = await Transaction.create(transData);
    await logAction(
      req.user,
      "CREATE",
      "Finance",
      `Recorded ${transaction.type}: ${transaction.category} (${transaction.amount} ${transaction.currency})`,
    );
    res.status(201).json({ success: true, data: transaction });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Transaction recording failed" });
  }
};

const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findByPk(req.params.id);
    if (!transaction)
      return res
        .status(404)
        .json({ success: false, message: "Transaction not found" });

    const auditTrail = `Deleted ${transaction.type}: ${transaction.category} (${transaction.amount} ${transaction.currency}) recorded by ${transaction.recordedBy}`;
    await transaction.destroy();
    
    await logAction(
      req.user,
      "DELETE",
      "Finance",
      auditTrail
    );

    res
      .status(200)
      .json({ success: true, message: "Transaction record cleared" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};

const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      type, amount, category, paymentMethod, 
      client, description, date, currency,
      department_id, user_id, recorded_by,
      financialInstitution, accountNumber
    } = req.body;

    const transaction = await Transaction.findByPk(id);
    if (!transaction) {
      return res.status(404).json({ success: false, message: "Transaction not found" });
    }

    const updateData = {
      type: type || transaction.type,
      amount: amount !== undefined ? amount : transaction.amount,
      category: category || transaction.category,
      paymentMethod: paymentMethod || transaction.paymentMethod,
      client: client !== undefined ? client : transaction.client,
      description: description !== undefined ? description : transaction.description,
      date: date || transaction.date,
      currency: currency || transaction.currency,
      userId: user_id || transaction.userId,
      departmentId: department_id || transaction.departmentId,
      recordedBy: recorded_by || transaction.recordedBy,
      financialInstitution: financialInstitution !== undefined ? financialInstitution : transaction.financialInstitution,
      accountNumber: accountNumber !== undefined ? accountNumber : transaction.accountNumber
    };

    // Auto-resolve department ID if category changed
    if (category && category !== transaction.category) {
      updateData.departmentId = await Department.resolveId(category);
    }

    await transaction.update(updateData);
    
    await logAction(
      req.user,
      "UPDATE",
      "Finance",
      `Updated ${transaction.type}: ${transaction.category} (${transaction.amount} ${transaction.currency})`
    );

    res.json({ success: true, data: transaction });
  } catch (error) {
    console.error("Update Transaction Error:", error);
    res.status(500).json({ success: false, message: "Failed to update transaction" });
  }
};

// --- BOOKING CONTROLLERS ---
const getBookings = async (req, res) => {
  try {
    const { departmentId, currency } = req.query;
    let where = {};

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (currency && currency !== "all") {
      where.currency = currency;
    }

    // Role-based isolation
    if (req.user.role !== "super_admin" && req.user.departmentId !== "all") {
      where.departmentId = req.user.departmentId;
    }

    const bookings = await Booking.findAll({
      where,
      include: [Customer], // Required for Name/Email in 3NF
      order: [["bookingDate", "ASC"]],
    });
    res.status(200).json({ success: true, data: bookings });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch bookings" });
  }
};
exports.getBookings = getBookings;

const createBooking = async (req, res) => {
  try {
    const { customerName, customerEmail, phoneNumber, countryCode, countryName, location, ...restBody } = req.body;
    let customerId = null;

    if (customerEmail || customerName) {
      let customer = null;
      if (customerEmail) {
        customer = await Customer.findOne({ where: { email: customerEmail } });
      }
      if (!customer && customerName) {
         customer = await Customer.create({
            name: customerName,
            email: customerEmail || null,
            phone: phoneNumber || null,
            countryCode: countryCode || "+250",
            countryName: countryName || "Rwanda"
         });
      }
      if (customer) {
        customerId = customer.id;
      }
    }

    const bookingData = {
      ...restBody,
      customerId,
      location,
      phoneNumber,
      countryCode: countryCode || "+250",
      countryName: countryName || "Rwanda",
      handledByAdminId: req.user ? req.user.id : null,
      handledByAdminName: req.user ? req.user.name : "Web/Online",
      receiptUrl: req.file ? req.file.filename : null,
    };

    const booking = await Booking.create(bookingData);
    await logAction(
      req.user,
      "CREATE",
      "Bookings",
      `New booking for ${customerName || "Customer"}`,
    );
    res.status(201).json({ success: true, data: booking });
  } catch (error) {
    console.error("Booking Error:", error);
    res.status(500).json({ success: false, message: "Booking failed: " + error.message });
  }
};

const updateBooking = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });

    // Auto-record who is handling this booking update
    const updateData = {
      ...req.body,
      countryCode: req.body.countryCode,
      countryName: req.body.countryName,
      handledByAdminId: req.user.id,
      handledByAdminName: req.user.name,
    };

    if (req.file) {
       updateData.receiptUrl = req.file.filename;
    }

    await booking.update(updateData);
    await logAction(
      req.user,
      "UPDATE",
      "Bookings",
      `Updated booking status for ${booking.customerName} to ${req.body.status || booking.status}`,
    );
    res.status(200).json({ success: true, data: booking });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

const deleteBooking = async (req, res) => {
  try {
    const booking = await Booking.findByPk(req.params.id);
    if (!booking)
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    await booking.destroy();
    res.status(200).json({ success: true, message: "Booking deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};

// --- MARKETING ASSET CONTROLLERS ---
const getMarketingAssets = async (req, res) => {
  try {
    const where = {};
    if (req.user.role !== "super_admin" && req.user.departmentId !== "all") {
      where.departmentId = req.user.departmentId;
    }
    const assets = await MarketingAsset.findAll({
      where,
      order: [
        ["displayOrder", "ASC"],
        ["createdAt", "DESC"],
      ],
    });
    res.json({ success: true, data: assets });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch marketing assets" });
  }
};

const createMarketingAsset = async (req, res) => {
  try {
    const data = {
      ...req.body,
      userId: req.user.id, // Link to creator
    };

    // Resolve departmentId from category if provided
    if (!data.departmentId && data.category) {
      data.departmentId = await Department.resolveId(data.category);
    }

    const asset = await MarketingAsset.create(data);
    await logAction(
      req.user,
      "CREATE",
      "Marketing",
      `Added marketing asset: ${asset.title}`,
    );
    res.status(201).json({ success: true, data: asset });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to create marketing asset" });
  }
};

const updateMarketingAsset = async (req, res) => {
  try {
    const asset = await MarketingAsset.findByPk(req.params.id);
    if (!asset)
      return res
        .status(404)
        .json({ success: false, message: "Asset not found" });
    await asset.update(req.body);
    await logAction(
      req.user,
      "UPDATE",
      "Marketing",
      `Updated marketing asset: ${asset.title}`,
    );
    res.json({ success: true, data: asset });
  } catch (error) {
    res.status(500).json({ success: false, message: "Update failed" });
  }
};

const deleteMarketingAsset = async (req, res) => {
  try {
    const asset = await MarketingAsset.findByPk(req.params.id);
    if (!asset)
      return res
        .status(404)
        .json({ success: false, message: "Asset not found" });
    await asset.destroy();
    await logAction(
      req.user,
      "DELETE",
      "Marketing",
      `Removed marketing asset: ${asset.title}`,
    );
    res.json({ success: true, message: "Deleted" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Delete failed" });
  }
};

// --- PUBLIC (NO AUTH) ---
const getPublicMarketingAssets = async (req, res) => {
  try {
    const assets = await MarketingAsset.findAll({
      where: { isActive: true },
      order: [
        ["displayOrder", "ASC"],
        ["createdAt", "DESC"],
      ],
    });
    res.json({ success: true, data: assets });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to fetch promotional assets" });
  }
};

exports.getMarketingAssets = getMarketingAssets;
exports.createMarketingAsset = createMarketingAsset;
exports.updateMarketingAsset = updateMarketingAsset;
exports.deleteMarketingAsset = deleteMarketingAsset;
exports.getPublicMarketingAssets = getPublicMarketingAssets;

// --- SIGNUP & PASSWORD RESET ---
const completeSignup = async (req, res) => {
  try {
    const { email, code, password } = req.body;
    const user = await AdminUser.findOne({
      where: { email, registrationCode: code },
    });

    if (!user)
      return res
        .status(400)
        .json({ error: "Invalid email or registration code" });
    if (new Date() > user.registrationCodeExpires)
      return res.status(400).json({
        error: "Code has expired. Please ask the admin for a new invitation.",
      });

    user.password = password;
    user.registrationCode = null;
    user.registrationCodeExpires = null;
    user.isEmailConfirmed = true;
    await user.save();

    res.json({
      success: true,
      message: "Signup complete! You can now log in.",
    });
  } catch (error) {
    res.status(500).json({ error: "Signup failed" });
  }
};

const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await AdminUser.findOne({ where: { email } });
    if (!user)
      return res
        .status(404)
        .json({ error: "No account found with this email" });

    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetPasswordCode = resetCode;
    user.resetPasswordExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 mins
    await user.save();

    await sendEmail({
      to: email,
      subject: "Password Reset Code - DRAVANUA HUB",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <div style="background: #1B5E20; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">DRAVANUA HUB</h1>
            <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">Password Reset Request</p>
          </div>
          
          <div style="padding: 30px; line-height: 1.6; color: #333;">
            <h2 style="color: #1B5E20; margin-top: 0;">Hello ${user.name},</h2>
            <p>We received a request to reset the password for your DRAVANUA HUB account.</p>
            
            <div style="background: #f9f9f9; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center; border-left: 4px solid #1B5E20;">
              <p style="margin: 0 0 10px; font-size: 14px; color: #64748b; font-weight: 600;">🔐 Your Password Reset Code:</p>
              <p style="margin: 0; color: #1B5E20; font-size: 32px; font-weight: bold; letter-spacing: 8px; font-family: 'Courier New', monospace;">${resetCode}</p>
            </div>

            <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 25px 0;">
              <p style="margin: 0; font-size: 13px; color: #856404;">
                ⏰ <strong>Time Sensitive:</strong> This code will expire in <strong>15 minutes</strong> for security purposes.
              </p>
            </div>
            
            <div style="background: #f8fafc; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
                <strong>Security Notice:</strong> If you did not request this password reset, please ignore this email and your password will remain unchanged. For security concerns, contact your system administrator immediately.
              </p>
            </div>

            <p style="margin-top: 30px; font-size: 14px; color: #64748b;">
              Enter this code on the password reset page to create your new password.
            </p>
          </div>
          
          <div style="background: #f4f4f4; padding: 15px; text-align: center; color: #888; font-size: 12px;">
            <p style="margin: 5px 0;">DRAVANUA HUB • Here to Create</p>
            <p style="margin: 5px 0;">Kigali, Rwanda</p>
            <p style="margin: 10px 0 5px; font-size: 11px; color: #aaa;">
              This is an automated security message from DRAVANUA HUB Operations.
            </p>
          </div>
        </div>
      `,
      text: `Hello ${user.name},\n\nYour password reset code is: ${resetCode}\n\nThis code will expire in 15 minutes.\n\nIf you did not request this, please ignore this email.\n\nBest regards,\nDRAVANUA HUB Team\nKigali, Rwanda`,
    });

    res.json({ success: true, message: "Reset code sent to your email." });
  } catch (error) {
    console.error("Password reset error:", error);
    res.status(500).json({ error: "Failed to send reset code" });
  }
};

const resetPassword = async (req, res) => {
  try {
    const { email, code, newPassword } = req.body;
    const user = await AdminUser.findOne({
      where: { email, resetPasswordCode: code },
    });

    if (!user) return res.status(400).json({ error: "Invalid code" });
    if (new Date() > user.resetPasswordExpires)
      return res
        .status(400)
        .json({ error: "Reset code has expired. Please request a new one." });

    user.password = newPassword;
    user.resetPasswordCode = null;
    user.resetPasswordExpires = null;
    await user.save();

    // Send confirmation email
    await sendEmail({
      to: email,
      subject: "Password Successfully Reset - DRAVANUA HUB",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <div style="background: #1B5E20; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">DRAVANUA HUB</h1>
            <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">Password Reset Confirmation</p>
          </div>
          
          <div style="padding: 30px; line-height: 1.6; color: #333;">
            <h2 style="color: #1B5E20; margin-top: 0;">Hello ${user.name},</h2>
            <p>Your password has been successfully reset.</p>
            
            <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 25px 0; text-align: center; border-left: 4px solid #1B5E20;">
              <p style="margin: 0; color: #1B5E20; font-size: 18px; font-weight: 600;">✓ Password Updated Successfully</p>
              <p style="margin: 10px 0 0; font-size: 13px; color: #2d5a27;">You can now log in with your new password.</p>
            </div>

            <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 25px 0;">
              <p style="margin: 0; font-size: 13px; color: #856404;">
                🔒 <strong>Security Reminder:</strong> If you did not make this change, please contact your system administrator immediately.
              </p>
            </div>
            
            <p style="margin-top: 30px; font-size: 14px; color: #475569;">
              <strong>Security Tips:</strong>
            </p>
            <ul style="color: #64748b; font-size: 13px; line-height: 1.8;">
              <li>Never share your password with anyone</li>
              <li>Use a strong, unique password for your account</li>
              <li>Log out when using shared devices</li>
            </ul>
          </div>
          
          <div style="background: #f4f4f4; padding: 15px; text-align: center; color: #888; font-size: 12px;">
            <p style="margin: 5px 0;">DRAVANUA HUB • Here to Create</p>
            <p style="margin: 5px 0;">Kigali, Rwanda</p>
            <p style="margin: 10px 0 5px; font-size: 11px; color: #aaa;">
              This is an automated security confirmation from DRAVANUA HUB.
            </p>
          </div>
        </div>
      `,
      text: `Hello ${user.name},\n\nYour password has been successfully reset.\n\nYou can now log in with your new password.\n\nIf you did not make this change, contact your administrator immediately.\n\nBest regards,\nDRAVANUA HUB Team\nKigali, Rwanda`,
    });

    res.json({ success: true, message: "Password updated successfully!" });
  } catch (error) {
    console.error("Password reset completion error:", error);
    res.status(500).json({ error: "Reset failed" });
  }
};

const uploadImage = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    const url = `${req.protocol}://${req.get("host")}/uploads/${req.file.filename}`;
    res.json({ success: true, url });
  } catch (error) {
    res.status(500).json({ error: "Upload failed" });
  }
};

// --- DROPBOX STUDIO INTEGRATION ---
const getDropboxFiles = async (req, res) => {
  try {
    const files = [
      {
        id: "dbx_1",
        name: "Studio_Shoot_RAW_001.jpg",
        size: "12.4 MB",
        path: "/studio/shoot1",
        category: "Studio",
        client: "John K.",
        date: new Date(),
      },
      {
        id: "dbx_2",
        name: "Classic_Fashion_Selection_Final.zip",
        size: "850 MB",
        path: "/Classic Fashions/final",
        category: "Classic Fashion",
        client: "Alice M.",
        date: new Date(),
      },
      {
        id: "dbx_3",
        name: "Stationery_Template_Draft.ai",
        size: "4.2 MB",
        path: "/design/drafts",
        category: "Stationery & Office Supplies",
        client: "General",
        date: new Date(),
      },
    ];

    // Filter by department
    let filteredFiles = files;
    if (req.user.role !== "super_admin" && req.user.departmentId) {
      const Department = require("../models/Department");
      const deptNames = await Department.getNameMap();
      const currentDeptName = deptNames[req.user.departmentId];
      filteredFiles = files.filter((f) => f.category === currentDeptName);
    }

    res.status(200).json({ success: true, data: filteredFiles });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Failed to connect to Dropbox Vault" });
  }
};

const uploadToDropbox = async (req, res) => {
  try {
    const file = req.file;
    if (!file)
      return res
        .status(400)
        .json({ success: false, message: "No file provided" });
    await logAction(
      req.user,
      "UPLOAD",
      "Dropbox",
      `Uploaded ${file.originalname} to studio vault`,
    );
    res.status(201).json({
      success: true,
      message: "Studio file successfully pushed to Dropbox Vault",
      data: {
        name: file.originalname,
        size: (file.size / 1024 / 1024).toFixed(2) + " MB",
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ success: false, message: "Dropbox synchronization failed" });
  }
};

const sendContract = async (req, res) => {
  try {
    const { email, contractData, totals } = req.body;
    if (!email)
      return res.status(400).json({ error: "Client email is required" });
    const html = `
  <div style="font-family: sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
    <!-- Header -->
    <div style="background: #1B5E20; padding: 30px; color: white; text-align: center;">
      <h1 style="margin: 0; font-size: 24px;">Official Service Agreement</h1>
      <p style="margin: 10px 0 0; opacity: 0.9; font-size: 14px;">DRAVANUA HUB • Contract ${contractData.contractNumber}</p>
      <p style="margin: 5px 0 0; opacity: 0.8; font-size: 12px;">Date: ${new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</p>
      <p style="margin: 5px 0 0; opacity: 0.8; font-size: 12px;">Classification: CONFIDENTIAL</p>
    </div>

    <div style="padding: 30px; line-height: 1.6; color: #1e293b;">
      <!-- Greeting -->
      <h2 style="color: #1B5E20; margin-top: 0;">Hello ${contractData.clientName},</h2>
      <p>Please find the official service agreement for your upcoming <strong>${contractData.eventType}</strong> session scheduled for <strong>${contractData.eventDate || "TBD"}</strong>.</p>

      <!-- Client Information -->
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1B5E20;">
        <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; color: #1B5E20; letter-spacing: 0.5px;">Client Information</h3>
        <table style="width: 100%;">
          <tr><td style="padding: 5px 0; color: #64748b; width: 120px;">Client Name:</td><td style="font-weight: 500;">${contractData.clientName}</td></tr>
          <tr><td style="padding: 5px 0; color: #64748b;">Email:</td><td>${contractData.email}</td></tr>
          <tr><td style="padding: 5px 0; color: #64748b;">Phone:</td><td>${contractData.phone || "N/A"}</td></tr>
          <tr><td style="padding: 5px 0; color: #64748b;">Address:</td><td>${contractData.address || "N/A"}</td></tr>
        </table>
      </div>

      <!-- Project Scope -->
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1B5E20;">
        <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; color: #1B5E20; letter-spacing: 0.5px;">Project Scope</h3>
        <table style="width: 100%;">
          <tr><td style="padding: 5px 0; color: #64748b; width: 120px;">Event Type:</td><td style="font-weight: 500;">${contractData.eventType}</td></tr>
          <tr><td style="padding: 5px 0; color: #64748b;">Event Date:</td><td>${contractData.eventDate || "TBD"}</td></tr>
          <tr><td style="padding: 5px 0; color: #64748b;">Venue:</td><td>${contractData.venue || "TBD"}</td></tr>
        </table>
      </div>

      <!-- Financial Breakdown -->
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1B5E20;">
        <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; color: #1B5E20; letter-spacing: 0.5px;">Financial Breakdown</h3>
        
        <!-- Service Items -->
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <thead>
            <tr style="background: #1B5E20; color: white;">
              <th style="padding: 10px; text-align: left; font-size: 12px;">DESCRIPTION</th>
              <th style="padding: 10px; text-align: right; font-size: 12px;">PRICE (${contractData.currency})</th>
            </tr>
          </thead>
          <tbody>
            ${contractData.items
              .map(
                (item) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px; font-size: 13px;">${item.description}</td>
                <td style="padding: 10px; text-align: right; font-weight: 500;">${item.price.toLocaleString()}</td>
              </tr>
            `,
              )
              .join("")}
          </tbody>
        </table>

        <!-- Totals -->
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="background: #e8f5e9;">
            <td style="padding: 10px; font-weight: 600;">Subtotal:</td>
            <td style="padding: 10px; text-align: right; font-weight: 600;">${totals.subtotal.toLocaleString()} ${contractData.currency}</td>
          </tr>
          <tr style="background: #ffebee;">
            <td style="padding: 10px; font-weight: 600; color: #c62828;">Deposit Paid:</td>
            <td style="padding: 10px; text-align: right; font-weight: 600; color: #c62828;">-${totals.deposit.toLocaleString()} ${contractData.currency}</td>
          </tr>
          <tr style="background: #fff9c4; border-top: 2px solid #1B5E20;">
            <td style="padding: 12px; font-weight: bold; font-size: 16px;">Balance Due:</td>
            <td style="padding: 12px; text-align: right; font-weight: bold; font-size: 18px; color: #1B5E20;">${totals.balance.toLocaleString()} ${contractData.currency}</td>
          </tr>
        </table>
      </div>

      <!-- Terms & Conditions -->
      <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #1B5E20;">
        <h3 style="margin-top: 0; font-size: 14px; text-transform: uppercase; color: #1B5E20; letter-spacing: 0.5px;">Terms & Conditions</h3>
        <div style="font-size: 13px; color: #475569; line-height: 1.8;">
          <p style="margin: 5px 0;"><strong>Standard Terms & Conditions apply.</strong></p>
          <ol style="margin: 10px 0; padding-left: 20px;">
            <li style="margin: 8px 0;">A non-refundable retainer/deposit of <strong>${totals.deposit.toLocaleString()} ${contractData.currency}</strong> is required to formally secure the date and services.</li>
            <li style="margin: 8px 0;">Final high-resolution media will be securely archived in the studio's cloud vault for 12 calendar months post-delivery.</li>
            <li style="margin: 8px 0;">This agreement serves as a binding contract. Cancellation policies apply as dictated by standard DRAVANUA STUDIO operational terms.</li>
          </ol>
        </div>
      </div>

      <!-- Important Notice -->
      <div style="background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 8px; margin: 25px 0;">
        <p style="margin: 0; font-size: 13px; color: #856404;">
          📋 <strong>Document Certification:</strong> This report was automatically generated by the DRAVANUA HUB system on <strong>${new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</strong>. All data reflects live operational metrics and is intended solely for internal management review. Unauthorised reproduction or distribution is strictly prohibited.
        </p>
      </div>

      <!-- Signature Section -->
      <div style="margin: 40px 0 20px;">
        <p style="font-size: 13px; color: #64748b; margin-bottom: 20px;">A digital copy of this contract has been securely archived in our vault. Please review the details and confirm your acceptance to formally secure the date.</p>
        
        <div style="display: flex; justify-content: space-between; margin-top: 30px;">
          <div style="text-align: center; flex: 1;">
            <div style="border-top: 1px solid #1B5E20; width: 200px; margin: 0 auto 5px;"></div>
            <p style="margin: 0; font-size: 12px; font-weight: 600;">${contractData.clientName}</p>
            <p style="margin: 0; font-size: 11px; color: #64748b;">Client Signature & Date</p>
          </div>
          <div style="text-align: center; flex: 1;">
            <div style="border-top: 1px solid #1B5E20; width: 200px; margin: 0 auto 5px;"></div>
            <p style="margin: 0; font-size: 12px; font-weight: 600;">Authorised Representative</p>
            <p style="margin: 0; font-size: 11px; color: #64748b;">DRAVANUA STUDIO</p>
          </div>
        </div>
      </div>

      <!-- Footer Notice -->
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center;">
        <p style="font-size: 12px; color: #64748b; margin: 5px 0;">Report ID: ${contractData.contractNumber}</p>
        <p style="font-size: 12px; color: #64748b; margin: 5px 0;">Generated by ${contractData.generatedBy || "Alice Musayidire"} • service_admin</p>
        <p style="font-size: 11px; color: #94a3b8; margin: 15px 0 5px;">This is an automated delivery from DRAVANUA HUB Operations Command.</p>
        <p style="font-size: 11px; color: #94a3b8; margin: 5px 0;">DRAVANUA HUB • Here to Create • Kigali, Rwanda</p>
      </div>
    </div>
  </div>
`;

    await sendEmail({
      to: email,
      subject: `Official Service Agreement - ${contractData.contractNumber}`,
      html,
    });

    await logAction(
      req.user,
      "DISPATCH",
      "Contracts",
      `Emailed contract ${contractData.contractNumber} to ${contractData.clientName}`,
    );

    res.json({
      success: true,
      message: "Contract successfully dispatched to client.",
    });
  } catch (error) {
    console.error("Contract Dispatch Error:", error);
    res.status(500).json({ error: "Failed to dispatch contract" });
  }
};

const updateProfile = async (req, res) => {
  try {
    const user = await AdminUser.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: "User profile not found" });

    const { name, profilePicture } = req.body;

    if (name) user.name = name;
    if (profilePicture) user.profilePicture = profilePicture;

    await user.save();

    await logAction(
      user,
      "UPDATE_PROFILE",
      "Self",
      `Updated personal profile ${name ? "(name)" : ""} ${profilePicture ? "(picture)" : ""}`,
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        departmentId: user.departmentId,
        profilePicture: user.profilePicture,
      },
    });
  } catch (error) {
    console.error("Profile Update Error:", error);
    res.status(500).json({ error: "Failed to update profile information" });
  }
};

const getTeamMembers = async (req, res) => {
  try {
    const team = await TeamMember.findAll({ 
      order: [
        ['order', 'ASC'], 
        ['createdAt', 'ASC']
      ] 
    });
    res.json({ success: true, data: team });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch team members" });
  }
};

const createTeamMember = async (req, res) => {
  try {
    const member = await TeamMember.create(req.body);
    await logAction(req.user, "CREATE", "Team", `Added team member ${member.name}`);
    res.status(201).json({ success: true, data: member });
  } catch (error) {
    console.error("Create Team Error:", error);
    res.status(500).json({ error: "Failed to create team member" });
  }
};

const updateTeamMember = async (req, res) => {
  try {
    const member = await TeamMember.findByPk(req.params.id);
    if (!member) return res.status(404).json({ error: "Team member not found" });
    await member.update(req.body);
    await logAction(req.user, "UPDATE", "Team", `Updated team member ${member.name}`);
    res.json({ success: true, data: member });
  } catch (error) {
    res.status(500).json({ error: "Failed to update team member" });
  }
};

const deleteTeamMember = async (req, res) => {
  try {
    const member = await TeamMember.findByPk(req.params.id);
    if (!member) return res.status(404).json({ error: "Team member not found" });
    const name = member.name;
    await member.destroy();
    await logAction(req.user, "DELETE", "Team", `Deleted team member ${name}`);
    res.json({ success: true, message: "Team member deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete team member" });
  }
};

const getDepartments = async (req, res) => {
  try {
    const departments = await Department.findAll({
      order: [['name', 'ASC']]
    });
    res.json({ success: true, data: departments });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch departments" });
  }
};

const verifyAttendance = async (req, res) => {
  try {
    const { id } = req.params;
    const { isVerified } = req.body;
    const att = await Attendance.findByPk(id);
    if (!att) return res.status(404).json({ error: "Attendance not found" });
    
    await att.update({
      isVerified,
      verifiedBy: req.user.id
    });
    
    await logAction(req.user, "VERIFY", "Attendance", `${isVerified ? 'Verified' : 'Unverified'} session for ${att.userName} on ${att.date}`);
    res.json({ success: true, data: att });
  } catch (error) {
    res.status(500).json({ error: "Failed to verify attendance" });
  }
};

module.exports = {
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
  uploadImage,
  upload,
  resendCode,
  getDropboxFiles,
  uploadToDropbox,
  sendContract,
  updateProfile,
  getOfficeLocation,
  updateOfficeLocation,
  getTeamMembers,
  createTeamMember,
  updateTeamMember,
  deleteTeamMember,
  getDepartments,
  verifyAttendance,
  adminRefresh,
  adminLogout,
};
