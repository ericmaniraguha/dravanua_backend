const jwt = require("jsonwebtoken");

/**
 * Standard Authentication Middleware
 * Decodes the access token from the Authorization header
 */
const authMiddleware = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided. Access denied." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dravanua-access-secret");

    req.user = decoded;
    next();
  } catch (error) {
    // If token is expired, the frontend should use the /refresh endpoint
    return res.status(401).json({ error: "Token expired or invalid", code: "TOKEN_EXPIRED" });
  }
};

const { AdminUser } = require("../models");

/**
 * Super Admin Authorization Guard
 * Also supports temporary role delegation (Acting Super Manager)
 */
const isSuperAdmin = async (req, res, next) => {
  try {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });

    // 1. Direct role check (fastest)
    if (req.user.role === "super_admin") return next();

    // 2. Check for temporary delegation in DB
    const dbUser = await AdminUser.findByPk(req.user.id);
    if (!dbUser) return res.status(404).json({ error: "User not found" });

    const now = new Date();
    if (
      dbUser.delegatedRole === "super_admin" && 
      dbUser.delegationExpires && 
      new Date(dbUser.delegationExpires) > now
    ) {
      return next();
    }

    res.status(403).json({ error: "Authorization denied. Super Admin access required (No active delegation found)." });
  } catch (error) {
    res.status(500).json({ error: "Internal Authorization Error" });
  }
};

module.exports = { authMiddleware, isSuperAdmin };
