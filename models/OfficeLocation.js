const { DataTypes, Op } = require("sequelize");

module.exports = (sequelize) => {
  const isMySQL =
    sequelize.getDialect() === "mysql" || sequelize.getDialect() === "mariadb";

  if (!isMySQL) {
    console.warn(
      "⚠️  WARNING: OfficeLocation model is optimized for MySQL/MariaDB only.\n" +
        `   Current dialect: ${sequelize.getDialect()}\n` +
        "   Some features may not work correctly.",
    );
  }

  const buildPoint = (lat, lon) => {
    if (lat == null || lon == null) return null;
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    if (isNaN(latNum) || isNaN(lonNum)) return null;
    if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
      return null;
    }
    return {
      type: "Point",
      coordinates: [lonNum, latNum],
    };
  };

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
      get() {
        const value = this.getDataValue("longitude");
        return value ? parseFloat(value) : null;
      },
    },
    geom: {
      type: DataTypes.GEOMETRY("POINT"),
      allowNull: true,
      comment: "MySQL POINT geometry.",
    },
    allowed_radius: {
      type: DataTypes.INTEGER,
      defaultValue: 100,
    },
    buffer_radius: {
      type: DataTypes.INTEGER,
      defaultValue: 150,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    address: {
      type: DataTypes.STRING(500),
      allowNull: true,
    },
    city: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    country: {
      type: DataTypes.STRING(100),
      allowNull: true,
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

  const options = {
    tableName: "office_locations",
    timestamps: false,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [
      { fields: ["is_active"] },
      { fields: ["city"] },
      { fields: ["country"] },
    ],
    charset: "utf8mb4",
    collate: "utf8mb4_unicode_ci",
    hooks: {
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
    },
  };

  const OfficeLocation = sequelize.define("OfficeLocation", fields, options);

  OfficeLocation.prototype.getCoordinates = function () {
    if (this.latitude != null && this.longitude != null) {
      return [parseFloat(this.longitude), parseFloat(this.latitude)];
    }
    return null;
  };

  OfficeLocation.findNearby = async function (lat, lon, radiusMeters, options = {}) {
    const safeLat = sanitizeCoord(lat, true);
    const safeLon = sanitizeCoord(lon, false);
    const safeRadius = Number(radiusMeters);
    const { where = {}, ...otherOptions } = options;
    const distExpr = `ST_Distance_Sphere(geom, POINT(${safeLon}, ${safeLat}))`;
    const whereClause = sequelize.and(
      where,
      sequelize.literal(`${distExpr} <= ${safeRadius}`),
    );
    return this.findAll({
      ...otherOptions,
      attributes: {
        include: [
          [sequelize.literal(`${distExpr}`), "computed_distance_m"],
        ],
      },
      where: whereClause,
      order: [[sequelize.literal(distExpr), "ASC"]],
    });
  };

  return OfficeLocation;
};
