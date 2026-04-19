/**
 * GPS-Verified Attendance System - Node.js/Express Routes
 * WITH DATABASE INTEGRATION & POSTGIS SUPPORT
 */

const express = require("express");
const { authMiddleware } = require("../middleware/authMiddleware");
const router = express.Router();
const {
  AttendanceModel,
  ViolationModel,
  LocationHistoryModel,
  OfficeLocationModel,
} = require("../models/attendance.model");
const { haversineDistance, isPostGISAvailable, distanceSQL } = require("../utils/geo");

// ══════════════════════════════════════════════════════════════
// CONFIGURATION (defaults — overridden by DB when available)
// ══════════════════════════════════════════════════════════════

const DEFAULT_OFFICE = {
  latitude: -1.9441, // Kigali, Rwanda
  longitude: 30.0619,
  allowed_radius: 100,
  buffer_radius: 150,
};

// Cache for office coordinates (refreshed once per server start)
let _officeCache = null;

/**
 * Get the active office coordinates from the database, or fall back
 * to hardcoded defaults. Result is cached for the process lifetime.
 */
async function getOfficeConfig() {
  if (_officeCache) return _officeCache;
  try {
    const office = await OfficeLocationModel.getOffice();
    if (office) {
      _officeCache = {
        latitude: parseFloat(office.latitude),
        longitude: parseFloat(office.longitude),
        allowed_radius: office.allowed_radius || DEFAULT_OFFICE.allowed_radius,
        buffer_radius: office.buffer_radius || DEFAULT_OFFICE.buffer_radius,
      };
    }
  } catch (err) {
    console.warn('⚠️  Could not load office location from DB, using defaults:', err.message);
  }
  if (!_officeCache) _officeCache = { ...DEFAULT_OFFICE };
  return _officeCache;
}

// ══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS (uses centralized geo utility)
// ══════════════════════════════════════════════════════════════

async function validateLocation(gpsLat, gpsLon) {
  const office = await getOfficeConfig();
  const distance = haversineDistance(
    gpsLat,
    gpsLon,
    office.latitude,
    office.longitude,
  );

  if (distance <= office.allowed_radius) {
    return {
      valid: true,
      distance,
      zone: "allowed",
      message: `Within allowed range (${distance}m)`,
    };
  } else if (distance <= office.buffer_radius) {
    return {
      valid: true,
      distance,
      zone: "buffer",
      message: `In buffer zone (${distance}m) - acceptable`,
    };
  } else {
    return {
      valid: false,
      distance,
      zone: "rejected",
      message: `Too far from office (${distance}m). Must be within ${office.buffer_radius}m`,
    };
  }
}

// ══════════════════════════════════════════════════════════════
// MIDDLEWARE
// ══════════════════════════════════════════════════════════════



// ══════════════════════════════════════════════════════════════
// ROUTES
// ══════════════════════════════════════════════════════════════

/**
 * POST /api/v1/admin/clock-in
 * Clock in with GPS verification
 */
router.post("/clock-in", authMiddleware, async (req, res) => {
  try {
    const {
      gps_lat,
      gps_lon,
      distance_from_office,
      gps_accuracy,
      check_in_method = "GPS_TERMINAL",
    } = req.body;

    // Validate required fields
    if (!gps_lat || !gps_lon) {
      return res.status(400).json({
        success: false,
        message: "GPS coordinates are required",
      });
    }

    // Validate GPS location
    const validation = await validateLocation(gps_lat, gps_lon);

    if (!validation.valid) {
      // Log violation
      await ViolationModel.create({
        userId: req.user.id,
        userName: req.user.name,
        violationType: "GEOFENCE_BREACH",
        date: new Date().toISOString().split("T")[0],
        timestamp: new Date().toISOString(),
        gpsLat: gps_lat,
        gpsLon: gps_lon,
        distanceFromOffice: validation.distance,
        attemptedAction: "CLOCK_IN",
        rejectionReason: validation.message,
        ipAddress: req.ip,
        deviceInfo: req.headers["user-agent"],
      });

      const office = await getOfficeConfig();
      return res.status(403).json({
        success: false,
        message: validation.message,
        distance: validation.distance,
        allowed_distance: office.buffer_radius,
        zone: validation.zone,
      });
    }

    // Server has fully verified the raw geocoordinates against the OfficeLocation securely.

    // Check for existing check-in today
    const today = new Date().toISOString().split("T")[0];
    const existingRecord = await AttendanceModel.findActiveByUserId(
      req.user.id,
      today,
    );

    if (existingRecord) {
      return res.status(400).json({
        success: false,
        message: "You are already checked in. Please check out first.",
        existing_record: existingRecord,
      });
    }

    // Create attendance record
    const now = new Date();
    const attendanceData = {
      userId: req.user.id,
      userName: req.user.name,
      departmentId: req.user.departmentId || null,
      date: today,
      clockIn: now.toISOString(),
      gpsLat: gps_lat,
      gpsLon: gps_lon,
      distanceFromOffice: validation.distance,
      gpsAccuracy: gps_accuracy,
      checkInMethod: check_in_method,
      status: "on-duty",
      zone: validation.zone,
    };

    const newRecord = await AttendanceModel.create(attendanceData);

    // Log GPS location history
    await LocationHistoryModel.create({
      userId: req.user.id,
      attendanceId: newRecord.id,
      gpsLat: gps_lat,
      gpsLon: gps_lon,
      accuracy: gps_accuracy,
      distanceFromOffice: validation.distance
    });

    console.log(
      `✅ Check-in: ${req.user.name} at ${now.toLocaleTimeString()} (${validation.distance}m)`,
    );

    res.status(200).json({
      success: true,
      message: `Successfully checked in at ${now.toLocaleTimeString()}`,
      data: newRecord,
      validation,
    });
  } catch (error) {
    console.error("Clock-in error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process check-in",
      error: error.message,
    });
  }
});

/**
 * POST /api/v1/admin/clock-out
 * Clock out and calculate total work hours
 */
router.post("/clock-out", authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Find active attendance record
    const attendanceRecord = await AttendanceModel.findActiveByUserId(
      req.user.id,
      today,
    );

    if (!attendanceRecord) {
      return res.status(400).json({
        success: false,
        message: "No active check-in found for today. Please check in first.",
      });
    }

    const clockOutTime = new Date();
    const clockInTime = new Date(attendanceRecord.clockIn);

    // Calculate total hours
    const timeDiff = clockOutTime - clockInTime;
    const totalHours = (timeDiff / 3600000).toFixed(1);

    // Update record
    const updated = AttendanceModel.updateClockOut(
      req.user.id,
      today,
      clockOutTime.toISOString(),
      parseFloat(totalHours),
    );

    if (!updated) {
      return res.status(500).json({
        success: false,
        message: "Failed to update attendance record",
      });
    }

    // Log GPS location history (optional for clock-out)
    if (req.body.gps_lat && req.body.gps_lon) {
      await LocationHistoryModel.create({
        userId: req.user.id,
        attendanceId: attendanceRecord.id,
        gpsLat: req.body.gps_lat,
        gpsLon: req.body.gps_lon,
        accuracy: req.body.gps_accuracy,
        distanceFromOffice: req.body.distance_from_office || 0
      });
    }

    console.log(
      `✅ Check-out: ${req.user.name} at ${clockOutTime.toLocaleTimeString()} (${totalHours} hrs)`,
    );

    res.status(200).json({
      success: true,
      message: `Successfully checked out at ${clockOutTime.toLocaleTimeString()}`,
      data: {
        clock_out: clockOutTime.toISOString(),
        total_hours: parseFloat(totalHours),
        work_duration: `${totalHours} hours`,
      },
    });
  } catch (error) {
    console.error("Clock-out error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to process check-out",
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/admin/attendance/today
 * Get current user's attendance record for today
 */
router.get("/attendance/today", authMiddleware, (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];
    const record = AttendanceModel.findTodayByUserId(req.user.id, today);

    if (!record) {
      return res.status(200).json({
        success: true,
        data: null,
        message: "No attendance record for today",
      });
    }

    res.status(200).json({
      success: true,
      data: record,
    });
  } catch (error) {
    console.error("Fetch today record error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance record",
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/admin/attendance
 * Get attendance logs with optional filters
 */
router.get("/attendance", authMiddleware, (req, res) => {
  try {
    const { date, department, status } = req.query;

    const filters = {};
    
    // Strict isolation filter: ensure standard users can only see their own attendance
    if (req.user && req.user.role !== 'super_admin') {
      filters.user_id = req.user.id;
    }

    if (date) filters.date = date;
    if (department) {
        const DepartmentModel = require('../models/Department');
        const deptId = await DepartmentModel.resolveId(department);
        if (deptId) filters.department_id = deptId;
    }
    if (status) filters.status = status;

    const records = AttendanceModel.findAll(filters);

    res.status(200).json({
      success: true,
      count: records.length,
      data: records,
    });
  } catch (error) {
    console.error("Fetch attendance logs error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance logs",
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/admin/attendance/stats
 * Get attendance statistics and analytics
 */
router.get("/attendance/stats", authMiddleware, (req, res) => {
  try {
    const today = new Date().toISOString().split("T")[0];

    const todayStats = AttendanceModel.getTodayStats(today);
    const departmentStats = AttendanceModel.getDepartmentStats(today);

    res.status(200).json({
      success: true,
      data: {
        today: {
          total_present: todayStats.total_present || 0,
          on_duty: todayStats.on_duty || 0,
          completed: todayStats.completed || 0,
          average_distance: Math.round(todayStats.avg_distance || 0),
          average_hours: parseFloat(todayStats.avg_hours || 0).toFixed(1),
        },
        departments: departmentStats,
      },
    });
  } catch (error) {
    console.error("Fetch stats error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch statistics",
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/admin/attendance/violations
 * Get recent attendance violations (admin only)
 */
router.get("/attendance/violations", authMiddleware, (req, res) => {
  try {
    // TODO: Add admin role check
    // if (req.user.role !== 'admin' && req.user.role !== 'super_admin') {
    //   return res.status(403).json({ success: false, message: 'Admin access required' });
    // }

    const limit = parseInt(req.query.limit) || 50;
    const violations = ViolationModel.getRecent(limit);

    res.status(200).json({
      success: true,
      count: violations.length,
      data: violations,
    });
  } catch (error) {
    console.error("Fetch violations error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch violations",
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/admin/attendance/history/:userId
 * Get attendance history for a specific user
 */
router.get("/attendance/history/:userId", authMiddleware, (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const limit = parseInt(req.query.limit) || 30;

    // Users can only view their own history unless admin
    if (
      req.user.id !== userId &&
      req.user.role !== "admin" &&
      req.user.role !== "super_admin"
    ) {
      return res.status(403).json({
        success: false,
        message: "You can only view your own attendance history",
      });
    }

    const history = AttendanceModel.getUserHistory(userId, limit);

    res.status(200).json({
      success: true,
      count: history.length,
      data: history,
    });
  } catch (error) {
    console.error("Fetch history error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch attendance history",
      error: error.message,
    });
  }
});

/**
 * GET /api/v1/admin/office/coordinates
 * Get office GPS coordinates for reference
 */
router.get("/office/coordinates", async (req, res) => {
  try {
    const office = await getOfficeConfig();
    res.status(200).json({
      success: true,
      data: {
        latitude: office.latitude,
        longitude: office.longitude,
        distance_rules: {
          allowed: office.allowed_radius,
          buffer: office.buffer_radius,
          maximum: office.buffer_radius,
        },
        message: "Office location coordinates",
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch office coordinates",
      error: error.message,
    });
  }
});

module.exports = router;
