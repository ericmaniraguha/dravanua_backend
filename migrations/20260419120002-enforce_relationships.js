'use strict';

/**
 * Migration: Enforce Orphaned Relationships
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    const { DataTypes } = Sequelize;

    console.log('\n🔗 Enforcing Database Relationships (Referential Integrity)');

    const fkOperations = [
      // [Table, Column, TargetTable, isNullable]
      ['transactions', 'user_id', 'admin_users', true],
      ['expenses', 'user_id', 'admin_users', true],
      ['purchases', 'user_id', 'admin_users', true],
      ['daily_reports', 'user_id', 'admin_users', true],
      ['daily_requests', 'user_id', 'admin_users', true],
      ['daily_floats', 'user_id', 'admin_users', true],
      ['gallery', 'user_id', 'admin_users', true],
      ['marketing_assets', 'user_id', 'admin_users', true],
      ['messages', 'receiver_id', 'admin_users', true],
      ['messages', 'department_id', 'departments', true]
    ];

    for (const [table, col, target, nullable] of fkOperations) {
      const tableInfo = await queryInterface.describeTable(table).catch(() => null);
      if (!tableInfo) continue;

      if (!tableInfo[col]) {
        console.log(`➕ Adding column ${table}.${col}...`);
        await queryInterface.addColumn(table, col, {
          type: DataTypes.INTEGER,
          allowNull: nullable,
          references: { model: target, key: 'id' },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        });
      } else {
        console.log(`🛡️  Ensuring constraint on ${table}.${col} → ${target}...`);
        const dialect = sequelize.getDialect();
        if (dialect === 'postgres') {
          await sequelize.query(`
            ALTER TABLE "${table}" 
            ADD CONSTRAINT "fk_${table}_${col}" 
            FOREIGN KEY ("${col}") REFERENCES "${target}"(id) 
            ON DELETE SET NULL ON UPDATE CASCADE
          `).catch(() => {});
        }
      }
    }
  },

  async down(queryInterface, Sequelize) {
    // Optional down logic
  }
};
