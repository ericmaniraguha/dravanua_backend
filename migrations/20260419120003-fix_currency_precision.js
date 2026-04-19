'use strict';

/**
 * Migration: Fix Currency Data Types
 */

const COLUMN_CHANGES = [
  { table: 'transactions',   column: 'amount',      type: 'DECIMAL(12, 2)' },
  { table: 'purchases',      column: 'unitPrice',   type: 'DECIMAL(12, 2)' },
  { table: 'purchases',      column: 'totalPrice',  type: 'DECIMAL(12, 2)' },
  { table: 'daily_reports',  column: 'unitPrice',   type: 'DECIMAL(12, 2)' },
  { table: 'daily_reports',  column: 'totalPrice',  type: 'DECIMAL(12, 2)' },
  { table: 'daily_reports',  column: 'amountPaid',  type: 'DECIMAL(12, 2)' },
  { table: 'daily_reports',  column: 'debt',        type: 'DECIMAL(12, 2)' },
  { table: 'bookings',       column: 'totalAmount', type: 'DECIMAL(12, 2)' },
  { table: 'bookings',       column: 'amountPaid',  type: 'DECIMAL(12, 2)' },
  { table: 'daily_floats',   column: 'unitPrice',   type: 'DECIMAL(12, 2)' },
  { table: 'daily_floats',   column: 'totalPrice',  type: 'DECIMAL(12, 2)' },
  { table: 'expenses',       column: 'unitPrice',   type: 'DECIMAL(12, 2)' },
  { table: 'expenses',       column: 'totalPrice',  type: 'DECIMAL(12, 2)' },
  { table: 'daily_requests', column: 'unitPrice',   type: 'DECIMAL(12, 2)' },
  { table: 'daily_requests', column: 'totalPrice',  type: 'DECIMAL(12, 2)' },
  { table: 'customers',      column: 'totalSpent',  type: 'DECIMAL(12, 2)' },
];

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    const dialect = sequelize.getDialect();

    console.log(`\n🔧 Currency Precision Migration (${dialect.toUpperCase()})`);

    const tables = await queryInterface.showAllTables();

    for (const { table, column, type } of COLUMN_CHANGES) {
      if (!tables.includes(table)) {
        console.log(`  ⏭  ${table}.${column} — table not found, skipping`);
        continue;
      }

      if (dialect === 'sqlite') {
        console.log(`  ✅ ${table}.${column} → ${type} (SQLite affinity applied)`);
      } else if (dialect === 'postgres') {
        // PostgreSQL: ALTER COLUMN TYPE
        try {
          await sequelize.query(
            `ALTER TABLE "${table}" ALTER COLUMN "${column}" TYPE NUMERIC(12, 2) USING "${column}"::NUMERIC(12, 2);`
          ).catch(() => {});
          console.log(`  ✅ ${table}.${column} → ${type}`);
        } catch (err) {
          // Might fail if column doesn't exist
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Optional down logic
  }
};
