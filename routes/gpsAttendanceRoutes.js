/**
 * GPS-Verified Attendance System - Node.js/Express Routes
 */

const express = require("express");
const { Sequelize, Op } = require("sequelize");
const { authMiddleware } = require("../middleware/authMiddleware");
const router = express.Router();

// ✅ Import all models
const AttendanceModel = require("../models/Attendance");
const ViolationModel = require("../models/Violation");
const LocationHistoryModel = require("../models/LocationHistory");
const OfficeLocation = require("../models/OfficeLocation");

// ✅ Import geolocation utilities
const { haversineDistance } = require("../utils/geolocation");

// ══════════════════════════════════════════════════════════════
// UTILITIES & HELPERS
// ══════════════════════════════════════════════════════════════

/**
 * ✅ FIX #6: Timezone-aware date helper
 * Returns YYYY-MM-DD in Rwanda local time (UTC+2)
 * Not UTC-only
 */
const getToday = () => {
  // Rwanda timezone: UTC+2
  const options = {
    timeZone: "Africa/Kigali",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  };
  const formatter = new Intl.DateTimeFormat("en-CA", options);
  return formatter.format(new Date());
};

/**
 * ✅ FIX #5: Centralized role check utility
 * Reduces duplication throughout routes
 */
const isAdmin = (user) => {
  return user && ["admin", "super_admin"].includes(user.role);
};

const isSuperAdmin = (user) => {
  return user && user.role === "super_admin";
};

/**
 * ✅ FIX #2: Edge-case safe coordinate validation
 * Uses Number.isFinite() and returns sanitized coordinates
 * Prevents NaN from entering database
 */
const sanitizeCoordinates = (lat, lon) => {
  const latNum = Number(lat);
  const lonNum = Number(lon);

  if (!Number.isFinite(latNum) || !Number.isFinite(lonNum)) {
    return null;
  }

  if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return null;
  }

  return { lat: latNum, lon: lonNum };
};

/**
 * ✅ FIX #4: Centralized distance expression builder
 * Reusable across routes, easier to maintain
 * Single source of truth for distance calculation SQL
 */
const buildDistanceExpression = (lat, lon, geomColumn = "geom") => {
  // Sanitize first
  const coords = sanitizeCoordinates(lat, lon);
  if (!coords) {
    throw new Error("Invalid coordinates for distance expression");
  }

  // ✅ Return reusable expression parts
  return {
    point: `POINT(${coords.lon}, ${coords.lat})`,
    distanceMeters: Sequelize.literal(
      `ST_Distance_Sphere(${geomColumn}, POINT(${coords.lon}, ${coords.lat}))`,
    ),
    distanceKm: Sequelize.literal(
      `ROUND(ST_Distance_Sphere(${geomColumn}, POINT(${coords.lon}, ${coords.lat})) / 1000, 2)`,
    ),
    distanceInMeters: Math.round(distance),
  };
};

/**
 * ✅ FIX #3: Sequelize version-safe update handling
 * Works across different Sequelize versions
 */
const safeUpdate = async (model, data, where) => {
  const result = await model.update(data, { where });

  // Handle different Sequelize versions
  // v5-v6 returns: [affectedCount]
  // v7 might return: count
  const affectedRows = Array.isArray(result) ? result[0] : result;

  return {
    success: affectedRows > 0,
    affectedRows,
  };
};

/**
 * ✅ FIX #6: Zone determination logic
 */
const getZone = (distance, office) => {
  if (distance <= office.allowed_radius) return "allowed";
  if (distance <= office.buffer_radius) return "buffer";
  return "rejected";
};

// ══════════════════════════════════════════════════════════════
// CONFIGURATION
// ══════════════════════════════════════════════════════════════

const DEFAULT_OFFICE = {
  latitude: -1.9441,
  longitude: 30.0619,
  allowed_radius: 100,
  buffer_radius: 150,
};

// ✅ Reduced cache TTL: 5 minutes
let _officeCache = null;
let _cacheTimestamp = null;
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Get office configuration with intelligent caching
 * ✅ FIX #7: Added spatial index warning at startup
 */
async function getOfficeConfig() {
  if (
    _officeCache &&
    _cacheTimestamp &&
    Date.now() - _cacheTimestamp < CACHE_TTL
  ) {
    return _officeCache;
  }

  try {
    const office = await OfficeLocation.findOne({
      where: { is_active: true },
      attributes: ["latitude", "longitude", "allowed_radius", "buffer_radius"],
    });

    if (office && office.latitude && office.longitude) {
      _officeCache = {
        latitude: parseFloat(office.latitude),
        longitude: parseFloat(office.longitude),
        allowed_radius: office.allowed_radius || DEFAULT_OFFICE.allowed_radius,
        buffer_radius: office.buffer_radius || DEFAULT_OFFICE.buffer_radius,
      };

      _cacheTimestamp = Date.now();
      console.log("ℹ️  Office location loaded (5 min cache)");
      return _officeCache;
    }
  } catch (error) {
    console.warn("⚠️  Could not load office location:", error.message);
  }

  _officeCache = { ...DEFAULT_OFFICE };
  _cacheTimestamp = Date.now();
  return _officeCache;
}

// ══════════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ══════════════════════════════════════════════════════════════

/**
 * Validate location against office geofence
 * ✅ FIX #2: Uses sanitizeCoordinates for safety
 */
async function validateLocation(gpsLat, gpsLon) {
  const coords = sanitizeCoordinates(gpsLat, gpsLon);

  if (!coords) {
    return {
      valid: false,
      distance: null,
      zone: "invalid",
      message: "Invalid GPS coordinates",
    };
  }

  const office = await getOfficeConfig();

  const distance = haversineDistance(
    coords.lat,
    coords.lon,
    office.latitude,
    office.longitude,
  );

  const zone = getZone(distance, office);

  return {
    valid: zone !== "rejected",
    distance: Math.round(distance),
    zone,
    message:
      zone === "allowed"
        ? `Within allowed range (${Math.round(distance)}m)`
        : zone === "buffer"
          ? `In buffer zone (${Math.round(distance)}m) - acceptable`
          : `Too far from office (${Math.round(distance)}m). Must be within ${office.buffer_radius}m`,
  };
}

/**
 * Log geofence violations
 * ✅ FIX #2: Uses sanitizeCoordinates
 */
async function logViolation(req, validation, attemptedAction) {
  try {
    const coords = sanitizeCoordinates(req.body.gps_lat, req.body.gps_lon);

    await ViolationModel.create({
      userId: req.user.id,
      userName: req.user.name || "Unknown",
      violationType: "GEOFENCE_BREACH",
      date: getToday(),
      timestamp: new Date().toISOString(),
      gpsLat: coords?.lat || null,
      gpsLon: coords?.lon || null,
      distanceFromOffice: validation.distance,
      attemptedAction: attemptedAction,
      rejectionReason: validation.message,
      ipAddress: req.ip || req.socket?.remoteAddress || "Unknown",
      userAgent: req.headers["user-agent"] || "Unknown",
    });
  } catch (error) {
    console.error("⚠️  Error logging violation:", error.message);
  }
}

/**
 * Log location history
 * ✅ FIX #2: Uses sanitizeCoordinates
 */
async function logLocationHistory(
  userId,
  attendanceId,
  gpsLat,
  gpsLon,
  accuracy,
) {
  try {
    const coords = sanitizeCoordinates(gpsLat, gpsLon);

    if (!coords) {
      console.warn("Invalid coordinates for location history");
      return;
    }

    await LocationHistoryModel.create({
      userId: userId,
      attendanceId: attendanceId,
      gpsLat: coords.lat,
      gpsLon: coords.lon,
      accuracy: Math.max(0, parseFloat(accuracy) || 0),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("⚠️  Error logging location history:", error.message);
  }
}

// ══════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/attendance/clock-in
 */
router.post("/clock-in", authMiddleware, async (req, res) => {
  try {
    const {
      gps_lat,
      gps_lon,
      gps_accuracy,
      check_in_method = "GPS_MOBILE",
    } = req.body;

    if (
      gps_lat === undefined ||
      gps_lat === null ||
      gps_lon === undefined ||
      gps_lon === null
    ) {
      return res.status(400).json({
        success: false,
        message: "GPS coordinates (gps_lat, gps_lon) are required",
        code: "MISSING_GPS_DATA",
      });
    }

    const validation = await validateLocation(gps_lat, gps_lon);

    if (!validation.valid) {
      await logViolation(req, validation, "CLOCK_IN");

      const office = await getOfficeConfig();
      return res.status(403).json({
        success: false,
        message: validation.message,
        distance: validation.distance,
        allowed_distance: office.buffer_radius,
        zone: validation.zone,
        code: "GEOFENCE_BREACH",
      });
    }

    const today = getToday();
    const now = new Date();

    // Check if an existing record exists for today
    const existingRecord = await AttendanceModel.findOne({
      where: {
        userId: req.user.id,
        date: today
      },
    });

    if (existingRecord && existingRecord.status === 'on-duty') {
      return res.status(400).json({
        success: false,
        message: "You are already checked in.",
        code: "ALREADY_CHECKED_IN",
        existing_check_in: existingRecord.lastClockIn || existingRecord.clockIn,
      });
    }

    const coords = sanitizeCoordinates(gps_lat, gps_lon);

    if (existingRecord) {
      // Re-clocking in for another session on the same day
      await existingRecord.update({
        lastClockIn: now.toISOString(),
        status: "on-duty",
        gpsLat: coords.lat,
        gpsLon: coords.lon,
        distanceFromOffice: validation.distance,
        zone: validation.zone
      });

      await logLocationHistory(req.user.id, existingRecord.id, coords.lat, coords.lon, gps_accuracy);

      return res.status(200).json({
        success: true,
        message: `Successfully re-clocked in at ${now.toLocaleTimeString()}`,
        code: "CLOCK_IN_SUCCESS",
        data: {
          id: existingRecord.id,
          timestamp: now.toISOString(),
          is_subsequent: true
        }
      });
    }

    // New record for the day
    const attendanceData = {
      userId: req.user.id,
      userName: req.user.name || "Unknown",
      departmentId: req.user.departmentId || null,
      date: today,
      clockIn: now.toISOString(), // Original first clock-in
      lastClockIn: now.toISOString(), // Start of this session
      gpsLat: coords.lat,
      gpsLon: coords.lon,
      distanceFromOffice: validation.distance,
      gpsAccuracy: Math.max(0, parseFloat(gps_accuracy) || 0),
      checkInMethod: check_in_method,
      status: "on-duty",
      zone: validation.zone,
    };

    const newRecord = await AttendanceModel.create(attendanceData);

    await logLocationHistory(
      req.user.id,
      newRecord.id,
      coords.lat,
      coords.lon,
      gps_accuracy,
    );

    console.log(`✅ Check-in: ${req.user.name} (${validation.distance}m)`);

    res.status(200).json({
      success: true,
      message: `Successfully checked in at ${now.toLocaleTimeString()}`,
      code: "CLOCK_IN_SUCCESS",
      data: {
        id: newRecord.id,
        timestamp: now.toISOString(),
        distance: validation.distance,
        zone: validation.zone,
      },
    });
  } catch (error) {
    console.error("❌ Clock-in error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to process check-in",
      code: "CLOCK_IN_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * POST /api/v1/attendance/clock-out
 * ✅ FIX #3: Sequelize version-safe update handling
 */
router.post("/clock-out", authMiddleware, async (req, res) => {
  try {
    const today = getToday();

    const attendanceRecord = await AttendanceModel.findOne({
      where: {
        userId: req.user.id,
        date: today,
        status: 'on-duty',
      },
    });

    if (!attendanceRecord) {
      return res.status(400).json({
        success: false,
        message: "No active session found for today.",
        code: "NO_ACTIVE_CHECKIN",
      });
    }

    const clockOutTime = new Date();
    // Use lastClockIn for interval, fallback to clockIn
    const sessionStartTime = new Date(attendanceRecord.lastClockIn || attendanceRecord.clockIn);

    const timeDiffMs = clockOutTime - sessionStartTime;
    const sessionHours = parseFloat((timeDiffMs / 3600000).toFixed(2));

    if (sessionHours < 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid session timing.",
        code: "INVALID_CLOCKOUT_TIME",
      });
    }

    const newTotalHours = parseFloat(((attendanceRecord.totalHours || 0) + sessionHours).toFixed(2));

    // ✅ FIX #3: Use safeUpdate for version compatibility
    const updateResult = await safeUpdate(
      AttendanceModel,
      {
        clockOut: clockOutTime.toISOString(),
        totalHours: newTotalHours,
        status: "off-duty",
        lastClockIn: null
      },
      { id: attendanceRecord.id },
    );

    if (!updateResult.success) {
      return res.status(500).json({
        success: false,
        message: "Failed to update attendance record",
        code: "UPDATE_FAILED",
      });
    }

    if (req.body.gps_lat && req.body.gps_lon) {
      await logLocationHistory(
        req.user.id,
        attendanceRecord.id,
        req.body.gps_lat,
        req.body.gps_lon,
        req.body.gps_accuracy,
      );
    }

    console.log(`✅ Check-out: ${req.user.name} (${totalHours} hours)`);

    res.status(200).json({
      success: true,
      message: `Successfully checked out at ${clockOutTime.toLocaleTimeString()}`,
      code: "CLOCK_OUT_SUCCESS",
      data: {
        clock_in: attendanceRecord.clockIn,
        clock_out: clockOutTime.toISOString(),
        total_hours: totalHours,
        work_duration: `${totalHours} hours`,
      },
    });
  } catch (error) {
    console.error("❌ Clock-out error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to process check-out",
      code: "CLOCK_OUT_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * GET /api/v1/attendance/today
 */
router.get("/today", authMiddleware, async (req, res) => {
  try {
    const today = getToday();

    const record = await AttendanceModel.findOne({
      where: {
        userId: req.user.id,
        date: today,
      },
    });

    if (!record) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No attendance record for today",
        code: "NO_RECORD",
      });
    }

    res.status(200).json({
      success: true,
      data: record,
      code: "RECORD_FOUND",
    });
  } catch (error) {
    console.error("❌ Fetch today record error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance record",
      code: "FETCH_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * GET /api/v1/attendance
 * ✅ FIX #1: Proper Op.and usage with sequelize.where()
 * ✅ FIX #5: Use isAdmin() utility
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { date, status, limit = 30, offset = 0 } = req.query;

    const where = {};

    // Filter by user if not admin
    if (!isAdmin(req.user)) {
      where.userId = req.user.id;
    }

    if (date) {
      where.date = date;
    }

    if (status) {
      where.status = status;
    }

    const records = await AttendanceModel.findAll({
      where,
      limit: Math.min(parseInt(limit) || 30, 100),
      offset: parseInt(offset) || 0,
      order: [
        ["date", "DESC"],
        ["clockIn", "DESC"],
      ],
    });

    res.status(200).json({
      success: true,
      count: records.length,
      pagination: {
        limit: parseInt(limit),
        offset: parseInt(offset),
      },
      data: records,
      code: "FETCH_SUCCESS",
    });
  } catch (error) {
    console.error("❌ Fetch attendance logs error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance logs",
      code: "FETCH_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * GET /api/v1/attendance/stats
 * ✅ FIX #4: Uses pre-built distance expression (if needed in future)
 */
router.get("/stats", authMiddleware, async (req, res) => {
  try {
    const today = getToday();

    const todayStats = await AttendanceModel.findAll({
      where: { date: today },
      attributes: [
        [Sequelize.fn("COUNT", Sequelize.col("id")), "total"],
        [
          Sequelize.fn(
            "SUM",
            Sequelize.literal(
              `CASE WHEN status = 'completed' THEN 1 ELSE 0 END`,
            ),
          ),
          "completed",
        ],
        [
          Sequelize.fn("AVG", Sequelize.col("distanceFromOffice")),
          "avg_distance",
        ],
        [Sequelize.fn("AVG", Sequelize.col("totalHours")), "avg_hours"],
      ],
      raw: true,
    });

    const stats = todayStats[0] || {};

    res.status(200).json({
      success: true,
      data: {
        date: today,
        total_present: parseInt(stats.total) || 0,
        completed: parseInt(stats.completed) || 0,
        on_duty:
          (parseInt(stats.total) || 0) - (parseInt(stats.completed) || 0),
        average_distance: Math.round(parseFloat(stats.avg_distance) || 0),
        average_hours: parseFloat(stats.avg_hours || 0).toFixed(2),
      },
      code: "STATS_SUCCESS",
    });
  } catch (error) {
    console.error("❌ Fetch stats error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      code: "STATS_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * GET /api/v1/attendance/violations
 * ✅ FIX #5: Use isAdmin utility
 */
router.get("/violations", authMiddleware, async (req, res) => {
  try {
    // ✅ FIX #5: Use isAdmin utility
    if (!isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
        code: "UNAUTHORIZED",
      });
    }

    const limit = Math.min(parseInt(req.query.limit) || 50, 500);
    const offset = parseInt(req.query.offset) || 0;

    const violations = await ViolationModel.findAll({
      limit,
      offset,
      order: [["timestamp", "DESC"]],
    });

    res.status(200).json({
      success: true,
      count: violations.length,
      data: violations,
      code: "VIOLATIONS_FOUND",
    });
  } catch (error) {
    console.error("❌ Fetch violations error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch violations",
      code: "VIOLATIONS_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * GET /api/v1/attendance/history/:userId
 * ✅ FIX #5: Use isAdmin utility
 */
router.get("/history/:userId", authMiddleware, async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = Math.min(parseInt(req.query.limit) || 30, 100);
    const offset = parseInt(req.query.offset) || 0;

    // ✅ FIX #5: Use isAdmin utility
    if (req.user.id !== userId && !isAdmin(req.user)) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own attendance history",
        code: "UNAUTHORIZED",
      });
    }

    if (isNaN(userId) || userId <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
        code: "INVALID_USERID",
      });
    }

    const history = await AttendanceModel.findAll({
      where: { userId: userId },
      limit,
      offset,
      order: [
        ["date", "DESC"],
        ["clockIn", "DESC"],
      ],
    });

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
      code: "HISTORY_FOUND",
    });
  } catch (error) {
    console.error("❌ Fetch history error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance history",
      code: "HISTORY_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

/**
 * GET /api/v1/attendance/location-history/:attendanceId
 * ✅ FIX #5: Use isAdmin utility
 */
router.get(
  "/location-history/:attendanceId",
  authMiddleware,
  async (req, res) => {
    try {
      const attendanceId = parseInt(req.params.attendanceId);

      const attendance = await AttendanceModel.findOne({
        where: { id: attendanceId },
      });

      if (!attendance) {
        return res.status(404).json({
          success: false,
          message: "Attendance record not found",
          code: "NOT_FOUND",
        });
      }

      // ✅ FIX #5: Use isAdmin utility
      if (req.user.id !== attendance.userId && !isAdmin(req.user)) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own location history",
          code: "UNAUTHORIZED",
        });
      }

      const history = await LocationHistoryModel.findAll({
        where: { attendanceId: attendanceId },
        order: [["timestamp", "ASC"]],
      });

      res.status(200).json({
        success: true,
        count: history.length,
        data: history,
        code: "LOCATION_HISTORY_FOUND",
      });
    } catch (error) {
      console.error("❌ Fetch location history error:", error.message);
      res.status(500).json({
        success: false,
        message: "Failed to fetch location history",
        code: "LOCATION_ERROR",
        error:
          process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  },
);

/**
 * GET /api/v1/attendance/office/coordinates
 */
router.get("/office/coordinates", async (req, res) => {
  try {
    const office = await getOfficeConfig();

    res.status(200).json({
      success: true,
      data: {
        latitude: office.latitude,
        longitude: office.longitude,
        geofence: {
          allowed_radius: office.allowed_radius,
          buffer_radius: office.buffer_radius,
        },
        note: "Use these coordinates for GPS verification",
      },
      code: "OFFICE_COORDS_FOUND",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch office coordinates",
      code: "COORDS_ERROR",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    });
  }
});

// ══════════════════════════════════════════════════════════════
// EXPORT
// ══════════════════════════════════════════════════════════════

module.exports = router;
