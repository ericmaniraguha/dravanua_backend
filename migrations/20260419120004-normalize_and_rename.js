'use strict';

/**
 * Migration: Normalize Schema & Standardize Naming (Snake Case)
 */

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    const sequelize = queryInterface.sequelize;
    const { DataTypes } = Sequelize;

    console.log(`\n🏗️  Schema Normalization & Naming Standardization`);

    // --- 1. Create & Seed Departments Table ---
    try {
      await queryInterface.createTable('departments', {
        id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
        name: { type: DataTypes.STRING, allowNull: false, unique: true },
        code: { type: DataTypes.STRING, allowNull: false, unique: true },
        is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
        created_at: { type: DataTypes.DATE, allowNull: false },
        updated_at: { type: DataTypes.DATE, allowNull: false }
      });
      console.log('✅ Table "departments" created');

      const now = new Date();
      const defaults = [
        { name: 'Studio', code: 'studio', created_at: now, updated_at: now },
        { name: 'Stationery & Office Supplies', code: 'papeterie', created_at: now, updated_at: now },
        { name: 'Flower Gifts', code: 'flower_gifts', created_at: now, updated_at: now },
        { name: 'Classic Fashion', code: 'classic_fashion', created_at: now, updated_at: now },
        { name: 'Marketing', code: 'marketing', created_at: now, updated_at: now },
        { name: 'General', code: 'general', created_at: now, updated_at: now }
      ];
      await queryInterface.bulkInsert('departments', defaults);
      console.log('✅ Default departments seeded');
    } catch (err) {}

    // Fetch departments for mapping
    const [depts] = await sequelize.query('SELECT id, name, code FROM departments');
    const deptMap = {};
    depts.forEach(d => {
      deptMap[d.name.toLowerCase()] = d.id;
      deptMap[d.code.toLowerCase()] = d.id;
    });

    // --- 2. Normalize Departments & Rename Columns ---
    const columnOperations = [
      ['admin_users', 'assignedService', 'department_id', DataTypes.INTEGER, true],
      ['admin_users', 'isActive', 'is_active', DataTypes.BOOLEAN],
      ['admin_users', 'isEmailConfirmed', 'is_email_confirmed', DataTypes.BOOLEAN],
      ['admin_users', 'confirmationToken', 'confirmation_token', DataTypes.STRING],
      ['admin_users', 'registrationCode', 'registration_code', DataTypes.STRING],
      ['admin_users', 'registrationCodeExpires', 'registration_code_expires', DataTypes.DATE],
      ['admin_users', 'resetPasswordCode', 'reset_password_code', DataTypes.STRING],
      ['admin_users', 'resetPasswordExpires', 'reset_password_expires', DataTypes.DATE],
      ['admin_users', 'profilePicture', 'profile_picture', DataTypes.STRING],
      ['activity_logs', 'userId', 'user_id', DataTypes.INTEGER],
      ['activity_logs', 'userName', 'user_name', DataTypes.STRING],
      ['activity_logs', 'department', 'department_id', DataTypes.INTEGER, true],
      ['attendance', 'userId', 'user_id', DataTypes.INTEGER],
      ['attendance', 'userName', 'user_name', DataTypes.STRING],
      ['attendance', 'department', 'department_id', DataTypes.INTEGER, true],
      ['attendance', 'clockIn', 'clock_in', DataTypes.DATE],
      ['attendance', 'clockOut', 'clock_out', DataTypes.DATE],
      ['attendance', 'totalHours', 'total_hours', DataTypes.FLOAT],
      ['attendance', 'gps_lat', 'gps_lat', DataTypes.DECIMAL],
      ['attendance', 'gps_lon', 'gps_lon', DataTypes.DECIMAL],
      ['attendance', 'distance_from_office', 'distance_from_office', DataTypes.INTEGER],
      ['attendance', 'gps_accuracy', 'gps_accuracy', DataTypes.DECIMAL],
      ['attendance', 'check_in_method', 'check_in_method', DataTypes.STRING],
      ['bookings', 'customerId', 'customer_id', DataTypes.INTEGER],
      ['bookings', 'serviceType', 'service_type', DataTypes.STRING],
      ['bookings', 'bookingDate', 'booking_date', DataTypes.DATE],
      ['bookings', 'totalAmount', 'total_amount', DataTypes.DECIMAL],
      ['bookings', 'amountPaid', 'amount_paid', DataTypes.DECIMAL],
      ['bookings', 'handledByAdminId', 'handled_by_admin_id', DataTypes.INTEGER],
      ['bookings', 'handledByAdminName', 'handled_by_admin_name', DataTypes.STRING],
      ['customers', 'totalSpent', 'total_spent', DataTypes.DECIMAL],
      ['customers', 'isActive', 'is_active', DataTypes.BOOLEAN],
      ['customers', 'referredBy', 'referred_by', DataTypes.STRING],
      ['daily_reports', 'unitPrice', 'unit_price', DataTypes.DECIMAL],
      ['daily_reports', 'totalPrice', 'total_price', DataTypes.DECIMAL],
      ['daily_reports', 'amountPaid', 'amount_paid', DataTypes.DECIMAL],
      ['daily_reports', 'timeToPay', 'time_to_pay', DataTypes.STRING],
      ['daily_reports', 'isPaid', 'is_paid', DataTypes.BOOLEAN],
      ['daily_reports', 'contactPerson', 'contact_person', DataTypes.STRING],
      ['daily_reports', 'createdBy', 'created_by', DataTypes.STRING],
      ['daily_reports', 'department', 'department_id', DataTypes.INTEGER, true],
      ['expenses', 'approvedBy', 'approved_by', DataTypes.STRING],
      ['expenses', 'unitPrice', 'unit_price', DataTypes.DECIMAL],
      ['expenses', 'totalPrice', 'total_price', DataTypes.DECIMAL],
      ['expenses', 'createdBy', 'created_by', DataTypes.STRING],
      ['expenses', 'department', 'department_id', DataTypes.INTEGER, true],
      ['purchases', 'approvedBy', 'approved_by', DataTypes.STRING],
      ['purchases', 'unitPrice', 'unit_price', DataTypes.DECIMAL],
      ['purchases', 'totalPrice', 'total_price', DataTypes.DECIMAL],
      ['purchases', 'createdBy', 'created_by', DataTypes.STRING],
      ['purchases', 'department', 'department_id', DataTypes.INTEGER, true],
      ['daily_floats', 'countedBy', 'counted_by', DataTypes.STRING],
      ['daily_floats', 'notesCoins', 'notes_coins', DataTypes.INTEGER],
      ['daily_floats', 'unitPrice', 'unit_price', DataTypes.DECIMAL],
      ['daily_floats', 'totalPrice', 'total_price', DataTypes.DECIMAL],
      ['daily_floats', 'createdBy', 'created_by', DataTypes.STRING],
      ['daily_requests', 'itemNeeded', 'item_needed', DataTypes.STRING],
      ['daily_requests', 'personRequested', 'person_requested', DataTypes.STRING],
      ['daily_requests', 'unitPrice', 'unit_price', DataTypes.DECIMAL],
      ['daily_requests', 'totalPrice', 'total_price', DataTypes.DECIMAL],
      ['daily_requests', 'createdBy', 'created_by', DataTypes.STRING],
      ['daily_requests', 'department', 'department_id', DataTypes.INTEGER, true],
      ['gallery', 'imageUrl', 'image_url', DataTypes.STRING],
      ['marketing_assets', 'imageUrl', 'image_url', DataTypes.STRING],
      ['marketing_assets', 'isActive', 'is_active', DataTypes.BOOLEAN],
      ['marketing_assets', 'displayOrder', 'display_order', DataTypes.INTEGER],
      ['messages', 'senderId', 'sender_id', DataTypes.INTEGER],
      ['messages', 'senderName', 'sender_name', DataTypes.STRING],
      ['messages', 'senderEmail', 'sender_email', DataTypes.STRING],
      ['messages', 'isRead', 'is_read', DataTypes.BOOLEAN],
      ['service_modules', 'isActive', 'is_active', DataTypes.BOOLEAN],
      ['service_modules', 'displayOrder', 'display_order', DataTypes.INTEGER],
      ['transactions', 'paymentMethod', 'payment_method', DataTypes.STRING],
      ['transactions', 'recordedBy', 'recorded_by', DataTypes.STRING],
      ['transactions', 'category', 'department_id', DataTypes.INTEGER, true],
      ['attendance_violations', 'userId', 'user_id', DataTypes.INTEGER],
      ['attendance_violations', 'userName', 'user_name', DataTypes.STRING],
      ['attendance_violations', 'violationType', 'violation_type', DataTypes.STRING],
      ['attendance_violations', 'gps_lat', 'gps_lat', DataTypes.DECIMAL],
      ['attendance_violations', 'gps_lon', 'gps_lon', DataTypes.DECIMAL],
      ['attendance_violations', 'distance_from_office', 'distance_from_office', DataTypes.INTEGER],
      ['attendance_violations', 'attemptedAction', 'attempted_action', DataTypes.STRING],
      ['attendance_violations', 'rejectionReason', 'rejection_reason', DataTypes.STRING],
      ['attendance_violations', 'ipAddress', 'ip_address', DataTypes.STRING],
      ['attendance_violations', 'deviceInfo', 'device_info', DataTypes.STRING],
    ];

    const allTables = await queryInterface.showAllTables();
    for (const table of allTables) {
      if (table === 'departments') continue;
      columnOperations.push([table, 'createdAt', 'created_at', DataTypes.DATE]);
      columnOperations.push([table, 'updatedAt', 'updated_at', DataTypes.DATE]);
    }

    for (const [table, oldCol, newCol, type, isDept] of columnOperations) {
      try {
        const tableInfo = await queryInterface.describeTable(table).catch(() => null);
        if (!tableInfo) continue;

        if (tableInfo[oldCol] && oldCol !== newCol) {
          if (isDept) {
            await queryInterface.addColumn(table, 'temp_dept_id', { type: DataTypes.INTEGER, allowNull: true });
            for (const [name, id] of Object.entries(deptMap)) {
              await sequelize.query(`UPDATE "${table}" SET temp_dept_id = ${id} WHERE LOWER("${oldCol}") = '${name.replace(/'/g, "''")}'`);
            }
            await queryInterface.removeColumn(table, oldCol);
            await queryInterface.renameColumn(table, 'temp_dept_id', newCol);
          } else {
            await queryInterface.renameColumn(table, oldCol, newCol);
          }
        } else if (!tableInfo[newCol]) {
          await queryInterface.addColumn(table, newCol, { type, allowNull: true });
        }
      } catch (err) {}
    }

    try {
      const tableInfo = await queryInterface.describeTable('bookings');
      if (tableInfo['customerName']) await queryInterface.removeColumn('bookings', 'customerName');
      if (tableInfo['customerEmail']) await queryInterface.removeColumn('bookings', 'customerEmail');
    } catch (err) {}
  },

  async down(queryInterface, Sequelize) {
    // Optional down logic
  }
};
