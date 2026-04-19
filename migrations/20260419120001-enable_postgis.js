'use strict';

/**
 * Migration: Enable PostGIS & Add Geography Columns
 */

const GEO_TABLES = [
  {
    table: 'gps_location_history',
    latCol: 'gps_lat',
    lonCol: 'gps_lon',
    geomCol: 'geom',
    indexName: 'idx_location_history_geom'
  },
  {
    table: 'attendance',
    latCol: 'gps_lat',
    lonCol: 'gps_lon',
    geomCol: 'geom',
    indexName: 'idx_attendance_geom'
  },
  {
    table: 'office_locations',
    latCol: 'latitude',
    lonCol: 'longitude',
    geomCol: 'geom',
    indexName: 'idx_office_locations_geom'
  },
  {
    table: 'attendance_violations',
    latCol: 'gps_lat',
    lonCol: 'gps_lon',
    geomCol: 'geom',
    indexName: 'idx_violations_geom'
  }
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    const dialect = sequelize.getDialect();

    if (dialect !== 'postgres') {
      console.log(`\n⏭  Skipping PostGIS — current dialect is "${dialect}".`);
      return;
    }

    // ── Step 1: Enable PostGIS extension ──────────────────────
    await sequelize.query('CREATE EXTENSION IF NOT EXISTS postgis;');
    console.log('✅ PostGIS extension enabled');

    for (const { table, latCol, lonCol, geomCol, indexName } of GEO_TABLES) {
      console.log(`── Processing ${table} ──`);

      // Check if table exists
      const [tables] = await sequelize.query(
        `SELECT tablename FROM pg_tables WHERE tablename = '${table}';`
      );
      if (tables.length === 0) {
        console.log(`   ⏭  Table not found, skipping`);
        continue;
      }

      // Step 2: Add geom column if it doesn't exist
      const [cols] = await sequelize.query(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_name = '${table}' AND column_name = '${geomCol}';`
      );

      if (cols.length === 0) {
        await sequelize.query(
          `ALTER TABLE "${table}" ADD COLUMN "${geomCol}" geography(Point, 4326);`
        );
        console.log(`   ✅ Added geography column "${geomCol}"`);
      }

      // Step 3: Back-fill geom from existing lat/lon data
      const [updateResult] = await sequelize.query(
        `UPDATE "${table}" 
         SET "${geomCol}" = ST_SetSRID(ST_MakePoint("${lonCol}", "${latCol}"), 4326)::geography
         WHERE "${latCol}" IS NOT NULL 
           AND "${lonCol}" IS NOT NULL 
           AND "${geomCol}" IS NULL;`
      );
      console.log(`   ✅ Back-filled existing rows`);

      // Step 4: Create spatial GiST index
      await sequelize.query(
        `CREATE INDEX IF NOT EXISTS "${indexName}" 
         ON "${table}" USING GIST ("${geomCol}");`
      );
      console.log(`   ✅ Spatial index "${indexName}" created`);

      // Step 5: Add a trigger to auto-populate geom on INSERT/UPDATE
      const triggerFn = `fn_${table}_update_geom`;
      const triggerName = `trg_${table}_update_geom`;

      await sequelize.query(`
        CREATE OR REPLACE FUNCTION ${triggerFn}()
        RETURNS TRIGGER AS $$
        BEGIN
          IF NEW."${latCol}" IS NOT NULL AND NEW."${lonCol}" IS NOT NULL THEN
            NEW."${geomCol}" := ST_SetSRID(ST_MakePoint(NEW."${lonCol}", NEW."${latCol}"), 4326)::geography;
          END IF;
          RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
      `);

      await sequelize.query(`
        DROP TRIGGER IF EXISTS "${triggerName}" ON "${table}";
        CREATE TRIGGER "${triggerName}"
        BEFORE INSERT OR UPDATE OF "${latCol}", "${lonCol}"
        ON "${table}"
        FOR EACH ROW
        EXECUTE FUNCTION ${triggerFn}();
      `);
      console.log(`   ✅ Auto-sync trigger "${triggerName}" installed`);
    }

    // Additional: Add composite index on location_history
    await sequelize.query(`
      CREATE INDEX IF NOT EXISTS idx_location_history_user_time
      ON gps_location_history (user_id, recorded_at DESC);
    `);
    console.log('✅ Composite index created on gps_location_history');
  },

  async down(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    const dialect = sequelize.getDialect();
    if (dialect !== 'postgres') return;

    for (const { table, geomCol, indexName } of GEO_TABLES) {
      await sequelize.query(`DROP TRIGGER IF EXISTS "trg_${table}_update_geom" ON "${table}";`);
      await sequelize.query(`DROP FUNCTION IF EXISTS "fn_${table}_update_geom"();`);
      await sequelize.query(`DROP INDEX IF EXISTS "${indexName}";`);
      await sequelize.query(`ALTER TABLE "${table}" DROP COLUMN IF EXISTS "${geomCol}";`);
    }
    await sequelize.query(`DROP INDEX IF EXISTS idx_location_history_user_time;`);
  }
};
