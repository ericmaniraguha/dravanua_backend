const { sequelize } = require("../config/db");

// ─────────────────────────────────────────────
// VALIDATION HELPERS
// ─────────────────────────────────────────────

/**
 * Validate latitude and longitude coordinates
 * @param {number} lat - Latitude (-90 to 90)
 * @param {number} lon - Longitude (-180 to 180)
 * @throws {Error} If coordinates are invalid
 */
function validateCoordinates(lat, lon) {
  if (typeof lat !== "number" || typeof lon !== "number") {
    throw new Error("Latitude and longitude must be numbers");
  }
  if (lat < -90 || lat > 90) {
    throw new Error(`Invalid latitude: ${lat}. Must be between -90 and 90`);
  }
  if (lon < -180 || lon > 180) {
    throw new Error(`Invalid longitude: ${lon}. Must be between -180 and 180`);
  }
}

/**
 * Validate search radius
 * @param {number} radiusMeters - Radius in meters
 * @throws {Error} If radius is invalid
 */
function validateRadius(radiusMeters) {
  if (typeof radiusMeters !== "number" || radiusMeters <= 0) {
    throw new Error(
      `Invalid radius: ${radiusMeters}. Must be a positive number`,
    );
  }
}

/**
 * Validate column name to prevent SQL injection
 * @param {string} columnName - Column name to validate
 * @throws {Error} If column name is invalid
 */
function validateColumnName(columnName) {
  if (!/^[a-zA-Z0-9_]+$/.test(columnName)) {
    throw new Error(`Invalid column name: ${columnName}`);
  }
}

/**
 * Validate that required columns exist in model
 * @param {Model} Model - Sequelize model
 * @param {Array<string>} columnNames - Column names to check
 * @throws {Error} If any column doesn't exist
 */
function validateModelColumns(Model, columnNames) {
  const modelAttributes = Object.keys(
    Model.getAttributes ? Model.getAttributes() : Model.rawAttributes || {},
  );

  for (const col of columnNames) {
    if (!modelAttributes.includes(col)) {
      throw new Error(
        `Column '${col}' does not exist in model '${Model.name}'. ` +
          `Available columns: ${modelAttributes.join(", ")}`,
      );
    }
  }
}

/**
 * Check if spatial index exists on column (MySQL/MariaDB)
 * @param {string} tableName - Table name
 * @param {string} columnName - Column name
 * @returns {Promise<boolean>} True if spatial index exists
 */
async function hasSpatialIndex(tableName, columnName) {
  try {
    const dialect = sequelize.getDialect();

    if (dialect !== "mysql" && dialect !== "mariadb") {
      return true; // Skip check for non-MySQL databases
    }

    const query = `
      SELECT COUNT(*) as count FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_NAME = '${tableName}' 
      AND COLUMN_NAME = '${columnName}' 
      AND INDEX_TYPE = 'SPATIAL'
    `;

    const result = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT,
    });
    return result && result.length > 0 && result[0].count > 0;
  } catch (error) {
    console.warn(`Could not verify spatial index: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────
// HAVERSINE (universal fallback - KEEP THIS)
// ─────────────────────────────────────────────

/**
 * Calculate distance between two geographic points using Haversine formula
 * @param {number} lat1 - Latitude of first point
 * @param {number} lon1 - Longitude of first point
 * @param {number} lat2 - Latitude of second point
 * @param {number} lon2 - Longitude of second point
 * @param {number} precision - Decimal places (default 0 = round to meter)
 * @returns {number} Distance in meters
 */
function haversineDistance(lat1, lon1, lat2, lon2, precision = 0) {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return precision === 0
    ? Math.round(distance)
    : parseFloat(distance.toFixed(precision));
}

// ─────────────────────────────────────────────
// MYSQL SPATIAL HELPERS (ORM-safe approach)
// ─────────────────────────────────────────────

/**
 * Create MySQL POINT value for WHERE clause
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {string} MySQL POINT expression
 */
function makePoint(lat, lon) {
  validateCoordinates(lat, lon);
  return sequelize.fn("POINT", lon, lat);
}

/**
 * Create distance expression using Sequelize literals
 * Safe because column name is validated, but we still use literal for complex expression
 * @param {string} geomColumn - Column name with POINT geometry
 * @param {number} lat - Reference latitude
 * @param {number} lon - Reference longitude
 * @returns {Object} Sequelize sequelize.where with distance expression
 */
function distanceCondition(geomColumn, lat, lon) {
  validateColumnName(geomColumn);
  validateCoordinates(lat, lon);

  const { Op } = sequelize.Sequelize;

  // Use sequelize.where with distance function
  // This is safer than raw WHERE clause literals
  return sequelize.where(
    sequelize.fn(
      "ST_Distance_Sphere",
      sequelize.col(geomColumn),
      sequelize.fn("POINT", lon, lat),
    ),
    Op.lte,
    0, // Placeholder - will be replaced in actual query
  );
}

/**
 * Create safe distance expression for SELECT
 * @param {string} geomColumn - Column name with POINT geometry
 * @param {number} lat - Reference latitude
 * @param {number} lon - Reference longitude
 * @returns {Object} Sequelize function for SELECT clause
 */
function distanceExpression(geomColumn, lat, lon) {
  validateColumnName(geomColumn);
  validateCoordinates(lat, lon);

  return [
    sequelize.fn(
      "ST_Distance_Sphere",
      sequelize.col(geomColumn),
      sequelize.fn("POINT", lon, lat),
    ),
    "computed_distance",
  ];
}

// ─────────────────────────────────────────────
// MAIN FUNCTION (Safe ORM approach)
// ─────────────────────────────────────────────

/**
 * Find all records within specified radius of coordinates
 * Uses Sequelize ORM where possible, avoiding raw SQL injection risks
 *
 * @param {Model} Model - Sequelize model
 * @param {number} lat - Reference latitude (-90 to 90)
 * @param {number} lon - Reference longitude (-180 to 180)
 * @param {number} radiusMeters - Search radius in meters (must be > 0)
 * @param {Object} options - Configuration options
 * @param {string} options.geomColumn - Column name with POINT geometry (default: 'geom')
 * @param {string} options.latColumn - Fallback latitude column (default: 'gps_lat')
 * @param {string} options.lonColumn - Fallback longitude column (default: 'gps_lon')
 * @param {Object} options.where - Additional WHERE conditions
 * @param {Array} options.order - Additional ORDER BY clauses
 * @param {number} options.limit - Maximum results to return
 * @param {number} options.offset - Results offset for pagination
 * @param {boolean} options.warnIfNoIndex - Log warning if spatial index missing (default: true)
 * @param {string} options.tableName - Table name for index check (auto-detected if not provided)
 *
 * @returns {Promise<Array>} Array of records with 'computed_distance' field (in meters)
 * @throws {Error} If validation fails or query errors
 *
 * @example
 * // Basic usage - uses MySQL spatial if available
 * const nearby = await findWithinRadius(User, 40.7128, -74.0060, 5000);
 *
 * @example
 * // With custom options
 * const nearby = await findWithinRadius(
 *   User,
 *   40.7128,
 *   -74.0060,
 *   10000,
 *   {
 *     where: { isActive: true },
 *     order: [['name', 'ASC']],
 *     limit: 20,
 *     tableName: 'users' // For index validation
 *   }
 * );
 */
async function findWithinRadius(Model, lat, lon, radiusMeters, options = {}) {
  try {
    // ===== VALIDATION =====
    validateCoordinates(lat, lon);
    validateRadius(radiusMeters);

    // ===== EXTRACT OPTIONS =====
    const {
      geomColumn = "geom",
      latColumn = "gps_lat",
      lonColumn = "gps_lon",
      where = {},
      order = [],
      tableName = Model.tableName,
      warnIfNoIndex = true,
      ...otherOptions
    } = options;

    // ===== VALIDATE COLUMNS =====
    validateColumnName(geomColumn);
    validateColumnName(latColumn);
    validateColumnName(lonColumn);

    // Validate that columns exist in the model
    validateModelColumns(Model, [geomColumn, latColumn, lonColumn]);

    const dialect = sequelize.getDialect();

    // ===== MYSQL/MARIADB OPTIMIZED PATH =====
    if (dialect === "mysql" || dialect === "mariadb") {
      // Warn if spatial index doesn't exist
      if (warnIfNoIndex && tableName) {
        const hasIndex = await hasSpatialIndex(tableName, geomColumn);
        if (!hasIndex) {
          console.warn(
            `⚠️  WARNING: No SPATIAL INDEX found on ${tableName}.${geomColumn}. ` +
              `Performance may be degraded. ` +
              `Create index: CREATE SPATIAL INDEX idx_${geomColumn} ON ${tableName}(${geomColumn});`,
          );
        }
      }

      // Build WHERE clause with ORM-safe distance condition
      const whereClause = {
        [Op.and]: [
          where,
          sequelize.where(
            sequelize.fn(
              "ST_Distance_Sphere",
              sequelize.col(geomColumn),
              sequelize.fn("POINT", lon, lat),
            ),
            Op.lte,
            radiusMeters,
          ),
        ],
      };

      // Add any additional conditions
      if (Object.keys(where).length > 0) {
        whereClause[sequelize.Sequelize.Op.and].push(where);
      }

      return await Model.findAll({
        ...otherOptions,
        attributes: {
          include: [distanceExpression(geomColumn, lat, lon)],
        },
        where: whereClause,
        order:
          order.length > 0
            ? order
            : [
                [
                  sequelize.literal(
                    `ST_Distance_Sphere(\`${geomColumn}\`, POINT(${lon}, ${lat}))`,
                  ),
                  "ASC",
                ],
              ],
        subQuery: false,
        raw: false,
      });
    }

    // ===== FALLBACK JAVASCRIPT PATH =====
    // For non-MySQL databases
    const allRecords = await Model.findAll({
      ...otherOptions,
      where,
    });

    // Validate that columns exist in returned data
    if (allRecords.length > 0) {
      const firstRecord = allRecords[0].toJSON();
      if (
        !firstRecord.hasOwnProperty(latColumn) ||
        !firstRecord.hasOwnProperty(lonColumn)
      ) {
        throw new Error(
          `Required columns not found in record. ` +
            `Expected: ${latColumn}, ${lonColumn}. ` +
            `Found: ${Object.keys(firstRecord).join(", ")}`,
        );
      }
    }

    const resultsWithDistance = allRecords
      .map((record) => {
        const r = record.toJSON();

        // Validate coordinates exist and are valid
        const recordLat = r[latColumn];
        const recordLon = r[lonColumn];

        if (
          recordLat === null ||
          recordLat === undefined ||
          recordLon === null ||
          recordLon === undefined
        ) {
          console.warn(
            `Record ${r.id || "unknown"} has missing coordinates: ` +
              `${latColumn}=${recordLat}, ${lonColumn}=${recordLon}`,
          );
          return null;
        }

        try {
          r.computed_distance = haversineDistance(
            lat,
            lon,
            recordLat,
            recordLon,
          );
          return r;
        } catch (error) {
          console.warn(
            `Failed to calculate distance for record ${r.id || "unknown"}: ${error.message}`,
          );
          return null;
        }
      })
      .filter((r) => r !== null) // Remove failed calculations
      .filter((r) => r.computed_distance <= radiusMeters)
      .sort((a, b) => a.computed_distance - b.computed_distance);

    // Apply limit if specified
    if (otherOptions.limit) {
      return resultsWithDistance.slice(0, otherOptions.limit);
    }

    return resultsWithDistance;
  } catch (error) {
    throw new Error(`Geolocation query failed: ${error.message}`);
  }
}

// ─────────────────────────────────────────────
// INDEX MANAGEMENT HELPERS
// ─────────────────────────────────────────────

/**
 * Create spatial index on geometry column (MySQL/MariaDB only)
 * @param {string} tableName - Table name
 * @param {string} columnName - Column name with POINT geometry
 * @returns {Promise<void>}
 */
async function createSpatialIndex(tableName, columnName) {
  try {
    const dialect = sequelize.getDialect();

    if (dialect !== "mysql" && dialect !== "mariadb") {
      console.warn(`Spatial indexes not supported for ${dialect}`);
      return;
    }

    validateColumnName(tableName);
    validateColumnName(columnName);

    const indexName = `idx_${columnName}_spatial`;

    await sequelize.query(
      `CREATE SPATIAL INDEX ${indexName} ON ${tableName}(${columnName})`,
    );

    console.log(`✅ Spatial index created: ${indexName}`);
  } catch (error) {
    if (error.message.includes("Duplicate key name")) {
      console.log(`ℹ️  Spatial index already exists`);
    } else {
      throw new Error(`Failed to create spatial index: ${error.message}`);
    }
  }
}

/**
 * Check and ensure spatial index exists
 * @param {string} tableName - Table name
 * @param {string} columnName - Column name with POINT geometry
 * @returns {Promise<boolean>} True if index exists, false otherwise
 */
async function ensureSpatialIndex(tableName, columnName) {
  try {
    const hasIndex = await hasSpatialIndex(tableName, columnName);

    if (!hasIndex) {
      console.log(`Creating missing spatial index...`);
      await createSpatialIndex(tableName, columnName);
      return true;
    }

    return true;
  } catch (error) {
    console.error(`Failed to ensure spatial index: ${error.message}`);
    return false;
  }
}

// ─────────────────────────────────────────────
// EXPORTS
// ─────────────────────────────────────────────

module.exports = {
  // Main function
  findWithinRadius,

  // Distance calculation
  haversineDistance,

  // ORM-safe helpers
  makePoint,
  distanceExpression,
  distanceCondition,

  // Index management
  createSpatialIndex,
  ensureSpatialIndex,
  hasSpatialIndex,

  // Validation (exported for testing)
  validateCoordinates,
  validateRadius,
  validateColumnName,
  validateModelColumns,
};
