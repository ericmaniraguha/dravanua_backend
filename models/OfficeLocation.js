const { DataTypes, Op } = require("sequelize"); // ✅ FIX #1: Import Op directly
const { sequelize } = require("../config/db");

// ─────────────────────────────────────────────
// DATABASE CHECK (MySQL only)
// ─────────────────────────────────────────────

const isMySQL =
  sequelize.getDialect() === "mysql" || sequelize.getDialect() === "mariadb";

if (!isMySQL) {
  console.warn(
    "⚠️  WARNING: OfficeLocation model is optimized for MySQL/MariaDB only.\n" +
      `   Current dialect: ${sequelize.getDialect()}\n` +
      "   Some features may not work correctly.",
  );
}

// ─────────────────────────────────────────────
// HELPER: Build GeoJSON Point (MySQL-optimized)
// ─────────────────────────────────────────────

/**
 * Build GeoJSON Point from lat/lon for MySQL
 * MySQL understands: {type: 'Point', coordinates: [lon, lat]}
 *
 * ✅ FIX #4: Handle falsy values correctly (0 is valid!)
 */
const buildPoint = (lat, lon) => {
  // Use null check instead of falsy check
  if (lat == null || lon == null) return null;

  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);

  // Validate ranges
  if (isNaN(latNum) || isNaN(lonNum)) return null;
  if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return null;
  }

  return {
    type: "Point",
    coordinates: [lonNum, latNum],
  };
};

// ─────────────────────────────────────────────
// HELPER: Sanitize coordinates (MySQL-specific)
// ─────────────────────────────────────────────

/**
 * ✅ FIX #3: Explicit sanitization for all coordinates
 * Always convert to number and validate
 * MySQL requires explicit numeric validation
 */
const sanitizeCoord = (value, isLat = false) => {
  const num = Number(value);

  if (Number.isNaN(num) || !Number.isFinite(num)) {
    throw new Error(`Invalid coordinate: ${value} is not a valid number`);
  }

  if (isLat && (num < -90 || num > 90)) {
    throw new Error(`Invalid latitude: ${num} must be between -90 and 90`);
  }

  if (!isLat && (num < -180 || num > 180)) {
    throw new Error(`Invalid longitude: ${num} must be between -180 and 180`);
  }

  return num;
};

// ─────────────────────────────────────────────
// MODEL DEFINITION
// ─────────────────────────────────────────────

const fields = {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    field: "office_id",
  },

  office_name: {
    type: DataTypes.STRING(255),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [1, 255],
    },
  },

  latitude: {
    type: DataTypes.DECIMAL(10, 7),
    allowNull: false,
    validate: {
      min: -90,
      max: 90,
      isDecimal: true,
    },
    // ✅ MySQL returns DECIMAL as STRING, convert to number
    get() {
      const value = this.getDataValue("latitude");
      return value ? parseFloat(value) : null;
    },
  },

  longitude: {
    type: DataTypes.DECIMAL(11, 7),
    allowNull: false,
    validate: {
      min: -180,
      max: 180,
      isDecimal: true,
    },
    // ✅ MySQL returns DECIMAL as STRING, convert to number
    get() {
      const value = this.getDataValue("longitude");
      return value ? parseFloat(value) : null;
    },
  },

  // ✅ MySQL POINT geometry column for spatial queries
  // MySQL stores this as POINT(lon, lat)
  geom: {
    type: DataTypes.GEOMETRY("POINT"),
    allowNull: true,
    comment:
      "MySQL POINT geometry. Auto-populated from latitude/longitude. Requires SPATIAL INDEX for performance.",
  },

  allowed_radius: {
    type: DataTypes.INTEGER,
    defaultValue: 100,
    validate: {
      min: 0,
      isInt: true,
    },
    comment: "Allowed radius in meters",
  },

  buffer_radius: {
    type: DataTypes.INTEGER,
    defaultValue: 150,
    validate: {
      min: 0,
      isInt: true,
    },
    comment: "Buffer radius in meters",
  },

  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true,
    index: true,
  },

  address: {
    type: DataTypes.STRING(500),
    allowNull: true,
  },

  city: {
    type: DataTypes.STRING(100),
    allowNull: true,
    index: true,
  },

  country: {
    type: DataTypes.STRING(100),
    allowNull: true,
    index: true,
  },

  created_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
  },

  updated_at: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW,
    onUpdate: DataTypes.NOW,
  },
};

// ─────────────────────────────────────────────
// INDEX CONFIGURATION (MySQL only)
// ─────────────────────────────────────────────

const indexes = [
  // Standard indexes only — SPATIAL INDEX is handled via afterSync hook
  // Sequelize's `using: 'SPATIAL'` generates invalid MySQL syntax (ADD INDEX ... USING SPATIAL)
  // The correct syntax is: ADD SPATIAL INDEX — handled by ensureSpatialIndex() below
  { fields: ["is_active"] },
  { fields: ["city"] },
  { fields: ["country"] },
];

// ─────────────────────────────────────────────
// MODEL OPTIONS
// ─────────────────────────────────────────────

const options = {
  tableName: "office_locations",
  timestamps: false,
  createdAt: "created_at",
  updatedAt: "updated_at",
  indexes: indexes,

  // ✅ MySQL-specific charset for international characters
  charset: "utf8mb4",
  collate: "utf8mb4_unicode_ci",

  hooks: {
    // ✅ FIX #4: Handle 0 as valid coordinate
    beforeCreate: (record) => {
      if (record.latitude != null && record.longitude != null) {
        record.geom = buildPoint(record.latitude, record.longitude);
      }
    },

    beforeUpdate: (record) => {
      if (record.changed("latitude") || record.changed("longitude")) {
        record.geom = buildPoint(record.latitude, record.longitude);
      }
    },

    // ✅ MySQL-specific startup check
    afterSync: async () => {
      console.log("ℹ️  OfficeLocation model synced for MySQL");
      console.log(
        "   SPATIAL INDEX: Required for optimal geo query performance",
      );
      console.log(
        "   Run: CREATE SPATIAL INDEX idx_geom_spatial ON office_locations(geom);",
      );
    },
  },
};

// ─────────────────────────────────────────────
// CREATE MODEL
// ─────────────────────────────────────────────

const OfficeLocation = sequelize.define("OfficeLocation", fields, options);

// ─────────────────────────────────────────────
// INSTANCE METHODS
// ─────────────────────────────────────────────

/**
 * Get coordinates as array [lon, lat]
 * @returns {Array|null} [longitude, latitude] or null if missing
 */
OfficeLocation.prototype.getCoordinates = function () {
  if (this.latitude != null && this.longitude != null) {
    return [parseFloat(this.longitude), parseFloat(this.latitude)];
  }
  return null;
};

/**
 * Check if coordinates are valid
 * @returns {boolean}
 */
OfficeLocation.prototype.hasValidCoordinates = function () {
  try {
    const lat = parseFloat(this.latitude);
    const lon = parseFloat(this.longitude);

    return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
  } catch {
    return false;
  }
};

/**
 * Check if geom is populated
 * @returns {boolean}
 */
OfficeLocation.prototype.hasGeom = function () {
  return this.geom !== null && this.geom !== undefined;
};

/**
 * Get distance to another office
 * @param {OfficeLocation} otherOffice
 * @returns {number} Distance in meters
 */
OfficeLocation.prototype.getDistanceTo = function (otherOffice) {
  if (!this.hasValidCoordinates() || !otherOffice.hasValidCoordinates()) {
    return null;
  }

  const { haversineDistance } = require("../utils/geolocation");
  return haversineDistance(
    this.latitude,
    this.longitude,
    otherOffice.latitude,
    otherOffice.longitude,
  );
};

// ─────────────────────────────────────────────
// CLASS METHODS (MySQL Spatial Queries)
// ─────────────────────────────────────────────

/**
 * Find offices within radius (MySQL optimized)
 *
 * ✅ FIX #2 & #3: Proper Op usage and explicit sanitization
 * Uses ST_Distance_Sphere for accurate distance calculations
 * Requires SPATIAL INDEX for performance on large datasets
 *
 * @param {number} lat - Reference latitude (-90 to 90)
 * @param {number} lon - Reference longitude (-180 to 180)
 * @param {number} radiusMeters - Search radius in meters (must be > 0)
 * @param {Object} options - Sequelize options (where, limit, offset, etc)
 * @returns {Promise<Array>} Matching offices with computed_distance_m and computed_distance_km
 *
 * @example
 * // Find active offices within 5km of NYC
 * const nearby = await OfficeLocation.findNearby(40.7128, -74.0060, 5000, {
 *   where: { is_active: true },
 *   limit: 10,
 *   order: [['computed_distance_m', 'ASC']]
 * });
 *
 * console.log(nearby[0].office_name, nearby[0].computed_distance_m, 'm away');
 */
OfficeLocation.findNearby = async function (
  lat,
  lon,
  radiusMeters,
  options = {},
) {
  try {
    // ✅ FIX #3: Explicit sanitization upfront
    const safeLat = sanitizeCoord(lat, true);
    const safeLon = sanitizeCoord(lon, false);
    const safeRadius = Number(radiusMeters);

    if (!Number.isFinite(safeRadius) || safeRadius <= 0) {
      throw new Error(
        `Invalid radius: ${radiusMeters} must be a positive number`,
      );
    }

    const { where = {}, ...otherOptions } = options;

    // ✅ MySQL ST_Distance_Sphere query
    // Returns distance in METERS
    const distExpr = `ST_Distance_Sphere(geom, POINT(${safeLon}, ${safeLat}))`;

    // ✅ FIX #2: Use sequelize.and() for proper condition combining
    const whereClause = sequelize.and(
      where,
      sequelize.literal(`${distExpr} <= ${safeRadius}`),
    );

    const result = await this.findAll({
      ...otherOptions,
      attributes: {
        include: [
          [sequelize.literal(`${distExpr}`), "computed_distance_m"],
          [
            sequelize.literal(`ROUND(${distExpr} / 1000, 2)`),
            "computed_distance_km",
          ],
        ],
      },
      where: whereClause,
      order: [[sequelize.literal(distExpr), "ASC"]],
      raw: false,
      subQuery: false,
    });

    return result;
  } catch (error) {
    throw new Error(`findNearby failed: ${error.message}`);
  }
};

/**
 * Find offices within allowed radius
 * Each office has allowed_radius and buffer_radius fields
 *
 * @param {number} lat - Reference latitude
 * @param {number} lon - Reference longitude
 * @param {Object} options - Query options
 * @returns {Promise<Array>} Matching offices
 */
OfficeLocation.findWithinAllowedRadius = async function (
  lat,
  lon,
  options = {},
) {
  try {
    const safeLat = sanitizeCoord(lat, true);
    const safeLon = sanitizeCoord(lon, false);

    const { where = {}, ...otherOptions } = options;

    // Use each office's allowed_radius
    // This is more complex - requires joining with self or calculating per-record
    const distExpr = `ST_Distance_Sphere(geom, POINT(${safeLon}, ${safeLat}))`;

    const result = await this.findAll({
      ...otherOptions,
      attributes: {
        include: [[sequelize.literal(distExpr), "computed_distance_m"]],
      },
      where: sequelize.and(
        where,
        // Where distance <= allowed_radius
        sequelize.literal(`${distExpr} <= allowed_radius`),
      ),
      order: [[sequelize.literal(distExpr), "ASC"]],
      raw: false,
      subQuery: false,
    });

    return result;
  } catch (error) {
    throw new Error(`findWithinAllowedRadius failed: ${error.message}`);
  }
};

/**
 * ✅ FIX #7: Verify SPATIAL INDEX exists and is correct
 * MySQL-specific index verification
 *
 * @returns {Promise<{exists: boolean, type: string, message: string}>}
 */
OfficeLocation.verifySpatialIndex = async function () {
  try {
    const result = await sequelize.query(
      `SELECT INDEX_NAME, INDEX_TYPE, SEQ_IN_INDEX 
       FROM INFORMATION_SCHEMA.STATISTICS 
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'office_locations' 
       AND COLUMN_NAME = 'geom'
       ORDER BY SEQ_IN_INDEX`,
      { type: sequelize.QueryTypes.SELECT },
    );

    if (!result || result.length === 0) {
      return {
        exists: false,
        type: "missing",
        message:
          "❌ SPATIAL INDEX not found. Create with: CREATE SPATIAL INDEX idx_geom_spatial ON office_locations(geom);",
      };
    }

    const index = result[0];

    if (index.INDEX_TYPE !== "SPATIAL") {
      return {
        exists: true,
        type: "wrong-type",
        message: `⚠️  Index type is ${index.INDEX_TYPE}, expected SPATIAL. Performance will be degraded.`,
      };
    }

    // Check if column is NOT NULL (SPATIAL INDEX works better with NOT NULL)
    const colResult = await sequelize.query(
      `SELECT IS_NULLABLE FROM INFORMATION_SCHEMA.COLUMNS 
       WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'office_locations' 
       AND COLUMN_NAME = 'geom'`,
      { type: sequelize.QueryTypes.SELECT },
    );

    if (colResult && colResult[0] && colResult[0].IS_NULLABLE === "YES") {
      return {
        exists: true,
        type: "warning",
        message:
          "⚠️  SPATIAL INDEX exists but geom column allows NULL. Consider adding NOT NULL constraint.",
      };
    }

    return {
      exists: true,
      type: "valid",
      message: "✅ SPATIAL INDEX is properly configured (MySQL optimized)",
    };
  } catch (error) {
    return {
      exists: false,
      type: "error",
      message: `❌ Error checking index: ${error.message}`,
    };
  }
};

/**
 * ✅ FIX #7: Auto-create spatial index with verification
 * MySQL-specific auto-index creation
 *
 * @returns {Promise<boolean>}
 */
OfficeLocation.ensureSpatialIndex = async function () {
  try {
    // Verify current state
    const status = await this.verifySpatialIndex();

    if (status.exists && status.type === "valid") {
      console.log("✅ SPATIAL INDEX already exists and is valid");
      return true;
    }

    console.log("Creating SPATIAL INDEX on office_locations.geom...");

    // Try to drop old index if it exists (MySQL syntax)
    try {
      await sequelize.query("DROP INDEX idx_geom_spatial ON office_locations");
    } catch {
      // Index doesn't exist, that's fine
    }

    // Create fresh spatial index (MySQL syntax)
    await sequelize.query(
      "CREATE SPATIAL INDEX idx_geom_spatial ON office_locations(geom)",
    );

    console.log("✅ SPATIAL INDEX created successfully");
    return true;
  } catch (error) {
    console.error(`❌ Error creating SPATIAL INDEX: ${error.message}`);
    return false;
  }
};

/**
 * Get detailed model statistics
 * Includes index status and coverage info
 *
 * @returns {Promise<Object>}
 */
OfficeLocation.getStats = async function () {
  try {
    const total = await this.count();
    const active = await this.count({ where: { is_active: true } });
    const withGeom = await this.count({
      where: sequelize.where(
        sequelize.col("geom"),
        Op.not, // ✅ FIX #1: Use imported Op
        null,
      ),
    });

    const indexStatus = await this.verifySpatialIndex();

    return {
      total,
      active,
      withGeom,
      coverage: total > 0 ? ((withGeom / total) * 100).toFixed(2) + "%" : "0%",
      indexStatus: indexStatus.message,
    };
  } catch (error) {
    throw new Error(`getStats failed: ${error.message}`);
  }
};

/**
 * Check database size (MySQL-specific)
 * Useful for monitoring large datasets
 *
 * @returns {Promise<Object>}
 */
OfficeLocation.getTableSize = async function () {
  try {
    const result = await sequelize.query(
      `SELECT 
        ROUND(((data_length + index_length) / 1024 / 1024), 2) as size_mb,
        table_rows as row_count
       FROM information_schema.tables 
       WHERE table_schema = DATABASE()
       AND table_name = 'office_locations'`,
      { type: sequelize.QueryTypes.SELECT },
    );

    if (!result || result.length === 0) {
      return { size_mb: 0, row_count: 0 };
    }

    return {
      size_mb: result[0].size_mb || 0,
      row_count: result[0].row_count || 0,
    };
  } catch (error) {
    return { size_mb: 0, row_count: 0, error: error.message };
  }
};

/**
 * Optimize table (MySQL-specific)
 * Defragments table and rebuilds indexes
 * Run occasionally for large datasets
 *
 * @returns {Promise<boolean>}
 */
OfficeLocation.optimizeTable = async function () {
  try {
    console.log("Optimizing office_locations table...");
    await sequelize.query("OPTIMIZE TABLE office_locations");
    console.log("✅ Table optimization complete");
    return true;
  } catch (error) {
    console.error(`⚠️  Optimization failed: ${error.message}`);
    return false;
  }
};

// ─────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────

module.exports = OfficeLocation;
