const { DataTypes } = require("sequelize");

module.exports = (sequelize) => {
  const Department = sequelize.define(
    "Department",
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        field: 'department_id'
      },
      name: {
        type: DataTypes.STRING,
        field: "dept_name",
        allowNull: false,
        comment: 'Canonical display name (e.g., "Studio", "Flower Gifts")',
      },
      code: {
        type: DataTypes.STRING,
        allowNull: false,
        comment: 'Lowercase normalized code (e.g., "studio", "flower_gifts")',
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        field: 'is_active',
      },
    },
    {
      tableName: "departments",
      timestamps: true,
      underscored: true,
      indexes: [
        { unique: true, fields: ['dept_name'] },
        { unique: true, fields: ['code'] }
      ]
    },
  );

  Department.seedDefaults = async function () {
    try {
      const defaults = [
        { name: "Creative Studio", code: "studio" },
        { name: "Stationery & Office Supplies", code: "papeterie" },
        { name: "Flower Gifts", code: "flower_gifts" },
        { name: "Classic Fashion", code: "classic_fashion" },
        { name: "Marketing Unit", code: "marketing" },
        { name: "Operations Unit", code: "operations" },
        { name: "General Management", code: "management" },
        { name: "Finance & Accounting", code: "finance" },
        { name: "Human Resources", code: "hr" },
        { name: "IT & Digital Support", code: "it" }
      ];

      for (const item of defaults) {
        await Department.findOrCreate({
          where: { code: item.code },
          defaults: item,
        });
      }
      console.log("✅ Default departments synced/seeded");
    } catch (error) {
      console.error("❌ Failed to seed default departments:", error.message);
    }
  };

  const _cache = new Map();
  Department.resolveId = async function (nameOrCode) {
    try {
      if (!nameOrCode) return null;

      const key = nameOrCode.toLowerCase().trim();
      if (_cache.has(key)) return _cache.get(key);

      const dept =
        (await Department.findOne({
          where: sequelize.where(sequelize.fn("LOWER", sequelize.col("dept_name")), key),
        })) ||
        (await Department.findOne({
          where: sequelize.where(sequelize.fn("LOWER", sequelize.col("code")), key),
        }));

      const id = dept ? dept.id : null;
      if (id) _cache.set(key, id);
      return id;
    } catch (error) {
      console.error(`❌ Error resolving department ID for "${nameOrCode}":`, error.message);
      return null;
    }
  };

  Department.getNameMap = async function () {
    const depts = await Department.findAll({ attributes: ["id", "name"] });
    const map = {};
    depts.forEach((d) => {
      map[d.id] = d.name;
    });
    return map;
  };

  return Department;
};
