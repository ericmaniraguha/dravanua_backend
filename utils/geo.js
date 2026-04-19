/**
 * Geospatial Utility Module
 * 
 * Provides distance calculations and spatial helpers that work across
 * both SQLite (Haversine math) and PostgreSQL+PostGIS (native ST_ functions).
 * 
 * When PostGIS is available, queries use GEOGRAPHY(Point, 4326) for
 * hardware-accelerated spatial indexing. On SQLite, it falls back to
 * the JavaScript Haversine formula.
 */

const { sequelize } = require('../config/db');

// ──────────────────────────────────────────────────────────
// HAVERSINE (works everywhere — JS-level fallback)
// ──────────────────────────────────────────────────────────

/**
 * Calculate the great-circle distance between two GPS points in meters.
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters (rounded)
 */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) ** 2 +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

// ──────────────────────────────────────────────────────────
// POSTGIS HELPERS (only used when dialect === 'postgres')
// ──────────────────────────────────────────────────────────

/**
 * Check whether PostGIS is available in the current PostgreSQL database.
 * Returns false for non-postgres dialects.
 */
async function isPostGISAvailable() {
  if (sequelize.getDialect() !== 'postgres') return false;
  try {
    const [results] = await sequelize.query(
      "SELECT 1 FROM pg_extension WHERE extname = 'postgis';"
    );
    return results.length > 0;
  } catch {
    return false;
  }
}

/**
 * Build a raw SQL fragment that creates a PostGIS point from lat/lon.
 * Uses SRID 4326 (WGS 84) — the standard GPS coordinate system.
 * @param {number} lat
 * @param {number} lon
 * @returns {string} SQL expression
 */
function makePointSQL(lat, lon) {
  return `ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography`;
}

/**
 * Build a raw SQL fragment for distance calculation between a column
 * and a fixed point. Returns distance in meters.
 * @param {string} geomColumn - Name of the geography column (e.g. 'geom')
 * @param {number} lat
 * @param {number} lon
 * @returns {string} SQL expression returning meters
 */
function distanceSQL(geomColumn, lat, lon) {
  return `ST_Distance(${geomColumn}, ${makePointSQL(lat, lon)})`;
}

/**
 * Build a raw SQL WHERE clause for "within radius" filtering.
 * Uses ST_DWithin for spatial-index acceleration.
 * @param {string} geomColumn - Name of the geography column
 * @param {number} lat - Center latitude
 * @param {number} lon - Center longitude
 * @param {number} radiusMeters - Search radius in meters
 * @returns {string} SQL boolean expression
 */
function withinRadiusSQL(geomColumn, lat, lon, radiusMeters) {
  return `ST_DWithin(${geomColumn}, ${makePointSQL(lat, lon)}, ${radiusMeters})`;
}

/**
 * Find all location history records within a given radius of a point.
 * Auto-selects PostGIS (fast) or Haversine (fallback) implementation.
 * 
 * @param {object} LocationHistory - Sequelize model
 * @param {number} lat - Center latitude
 * @param {number} lon - Center longitude
 * @param {number} radiusMeters - Search radius
 * @param {object} [options] - Additional query options (limit, order, etc.)
 * @returns {Promise<Array>} Matching records with computed distance
 */
async function findWithinRadius(LocationHistory, lat, lon, radiusMeters, options = {}) {
  const dialect = sequelize.getDialect();

  if (dialect === 'postgres' && await isPostGISAvailable()) {
    // ── PostGIS path: uses spatial index for O(log n) lookups ──
    const distExpr = distanceSQL('geom', lat, lon);
    return LocationHistory.findAll({
      ...options,
      attributes: {
        include: [
          [sequelize.literal(`ROUND(${distExpr})`), 'computed_distance']
        ]
      },
      where: {
        ...options.where,
        [sequelize.Sequelize.Op.and]: [
          sequelize.literal(withinRadiusSQL('geom', lat, lon, radiusMeters))
        ]
      },
      order: options.order || [[sequelize.literal(distExpr), 'ASC']]
    });
  } else {
    // ── SQLite / no-PostGIS fallback: fetch all then filter in JS ──
    const allRecords = await LocationHistory.findAll(options);
    return allRecords
      .map(record => {
        const r = record.toJSON();
        r.computed_distance = haversineDistance(lat, lon, r.gps_lat, r.gps_lon);
        return r;
      })
      .filter(r => r.computed_distance <= radiusMeters)
      .sort((a, b) => a.computed_distance - b.computed_distance);
  }
}

module.exports = {
  haversineDistance,
  isPostGISAvailable,
  makePointSQL,
  distanceSQL,
  withinRadiusSQL,
  findWithinRadius
};
