const Attendance = require('./Attendance');
const Violation = require('./Violation');
const LocationHistory = require('./LocationHistory');
const OfficeLocation = require('./OfficeLocation');
const { findWithinRadius, haversineDistance } = require('../utils/geo');

// Wrappers to support the methods used in the gpsAttendanceRoutes.js

const AttendanceModel = {
  create: async (data) => Attendance.create(data),
  findActiveByUserId: async (userId, date) => {
    return Attendance.findOne({ where: { userId, date, clockOut: null } });
  },
  updateClockOut: async (userId, date, clockOutTime, totalHours) => {
    const record = await Attendance.findOne({ where: { userId, date } });
    if (record) {
      await record.update({ clockOut: clockOutTime, totalHours });
      return true;
    }
    return false;
  },
  findTodayByUserId: async (userId, date) => {
    return Attendance.findOne({ where: { userId, date } });
  },
  findAll: async (filters) => {
    return Attendance.findAll({ where: filters });
  },
  getTodayStats: async (date) => {
    // simplified implementation
    return { total_present: 0, on_duty: 0, completed: 0, avg_distance: 0, avg_hours: 0 };
  },
  getDepartmentStats: async (date) => {
    return [];
  },
  getUserHistory: async (userId, limit) => {
    return Attendance.findAll({ where: { userId }, limit, order: [['date', 'DESC']] });
  }
};

const ViolationModel = {
  create: async (data) => Violation.create(data),
  getRecent: async (limit) => Violation.findAll({ limit, order: [['created_at', 'DESC']] })
};

const LocationHistoryModel = {
  create: async (data) => LocationHistory.create(data),

  /**
   * Find all location pings within a given radius of a point.
   * Uses PostGIS spatial index when available, otherwise falls back
   * to in-memory Haversine filtering.
   * 
   * @param {number} lat - Center latitude
   * @param {number} lon - Center longitude
   * @param {number} radiusMeters - Search radius in meters
   * @param {object} [queryOptions] - Additional Sequelize query options
   * @returns {Promise<Array>} Records with computed_distance field
   */
  findWithinRadius: async (lat, lon, radiusMeters, queryOptions = {}) => {
    return findWithinRadius(LocationHistory, lat, lon, radiusMeters, queryOptions);
  },

  /**
   * Get the movement trail for a user on a given date, with
   * distance-from-office computed for each point.
   * 
   * @param {number} userId
   * @param {string} date - ISO date string (YYYY-MM-DD)
   * @param {number} officeLat
   * @param {number} officeLon
   * @returns {Promise<Array>}
   */
  getUserTrail: async (userId, date, officeLat, officeLon) => {
    const { Op } = require('sequelize');
    const startOfDay = new Date(`${date}T00:00:00Z`);
    const endOfDay = new Date(`${date}T23:59:59Z`);

    const records = await LocationHistory.findAll({
      where: {
        userId,
        recorded_at: { [Op.between]: [startOfDay, endOfDay] }
      },
      order: [['recorded_at', 'ASC']]
    });

    // Enrich each record with the computed distance from office
    return records.map(r => {
      const json = r.toJSON();
      json.computed_distance_from_office = haversineDistance(
        parseFloat(json.gps_lat),
        parseFloat(json.gps_lon),
        officeLat,
        officeLon
      );
      return json;
    });
  }
};

const OfficeLocationModel = {
  getOffice: async () => OfficeLocation.findOne({ where: { is_active: true } })
};

module.exports = {
  AttendanceModel,
  ViolationModel,
  LocationHistoryModel,
  OfficeLocationModel
};
