'use strict';

/**
 * Migration: Optimize Indexes & Spatial Performance
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    const dialect = sequelize.getDialect();

    console.log(`\n⚡ Indexing & Performance Optimization (${dialect.toUpperCase()})`);

    if (dialect !== 'postgres') {
      console.log('ℹ️  Skipping spatial GiST/explicit FK indexes (not PostgreSQL).');
      return;
    }

    const indexes = [
      // Spatial Indexes (GiST)
      ['gps_location_history', 'geom', 'idx_gps_location_geom', 'GIST'],
      ['office_locations', 'geom', 'idx_office_geom', 'GIST'],

      // User FK Indexes
      ['gps_location_history', 'user_id', 'idx_gps_location_user_id'],
      ['attendance', 'user_id', 'idx_attendance_user_id'],
      ['activity_logs', 'user_id', 'idx_activity_logs_user_id'],
      ['daily_reports', 'user_id', 'idx_daily_reports_user_id'],
      ['expenses', 'user_id', 'idx_expenses_user_id'],
      ['purchases', 'user_id', 'idx_purchases_user_id'],
      ['daily_requests', 'user_id', 'idx_daily_requests_user_id'],
      ['daily_floats', 'user_id', 'idx_daily_floats_user_id'],
      ['gallery', 'user_id', 'idx_gallery_user_id'],
      ['marketing_assets', 'user_id', 'idx_marketing_assets_user_id'],
      ['transactions', 'user_id', 'idx_transactions_user_id'],
      ['messages', 'sender_id', 'idx_messages_sender_id'],
      ['messages', 'receiver_id', 'idx_messages_receiver_id'],

      // Department FK Indexes
      ['admin_users', 'department_id', 'idx_admin_users_dept_id'],
      ['bookings', 'department_id', 'idx_bookings_dept_id'],
      ['activity_logs', 'department_id', 'idx_activity_logs_dept_id'],
      ['daily_reports', 'department_id', 'idx_daily_reports_dept_id'],
      ['expenses', 'department_id', 'idx_expenses_dept_id'],
      ['purchases', 'department_id', 'idx_purchases_dept_id'],
      ['daily_requests', 'department_id', 'idx_daily_requests_dept_id'],
      ['daily_floats', 'department_id', 'idx_daily_floats_dept_id'],
      ['gallery', 'department_id', 'idx_gallery_dept_id'],
      ['marketing_assets', 'department_id', 'idx_marketing_assets_dept_id'],
      ['transactions', 'department_id', 'idx_transactions_dept_id'],
      ['messages', 'department_id', 'idx_messages_dept_id'],

      // Customer FK Indexes
      ['bookings', 'customer_id', 'idx_bookings_customer_id'],
      
      // Common Query Columns
      ['bookings', 'booking_date', 'idx_bookings_date'],
      ['attendance', 'date', 'idx_attendance_date'],
    ];

    for (const [table, cols, name, type] of indexes) {
      try {
        const options = { name };
        if (type) options.using = type;
        await queryInterface.addIndex(table, Array.isArray(cols) ? cols : [cols], options).catch(() => {});
      } catch (err) {}
    }
  },

  async down(queryInterface, Sequelize) {
    // Optional down logic
  }
};
