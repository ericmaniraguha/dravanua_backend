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

/**
 * Super Admin Authorization Guard
 */
const isSuperAdmin = (req, res, next) => {
  if (req.user && req.user.role === "super_admin") {
    next();
  } else {
    res.status(403).json({ error: "Authorization denied. Super Admin access required." });
  }
};

module.exports = { authMiddleware, isSuperAdmin };
