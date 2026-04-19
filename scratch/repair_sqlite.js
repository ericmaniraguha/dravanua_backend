const { sequelize } = require('../config/db');

async function repairSqliteSchema() {
    if (sequelize.getDialect() !== 'sqlite') {
        console.log('Not using SQLite. Skipping manual schema repair.');
        return;
    }

    try {
        console.log('Detecting missing columns in SQLite...');
        
        const tables = [
            { name: 'admin_users', columns: ['department_id', 'is_active', 'is_email_confirmed', 'confirmation_token', 'registration_code', 'registration_code_expires', 'reset_password_code', 'reset_password_expires'] },
            { name: 'attendance', columns: ['department_id', 'status', 'zone', 'user_id', 'user_name', 'clock_in', 'clock_out', 'total_hours', 'gps_lat', 'gps_lon', 'distance_from_office', 'gps_accuracy', 'check_in_method'] },
            { name: 'transactions', columns: ['department_id', 'user_id', 'type', 'amount', 'currency', 'category', 'date', 'description', 'payment_method', 'client', 'recorded_by'] },
            { name: 'daily_reports', columns: ['department_id', 'user_id'] },
            { name: 'messages', columns: ['sender_name', 'sender_email', 'content', 'is_read', 'replied', 'department_id', 'sender_id', 'receiver_id'] },
            { name: 'bookings', columns: ['customer_id', 'department_id', 'handled_by_admin_id', 'handled_by_admin_name', 'location', 'phone_number'] }
        ];

        for (const table of tables) {
            console.log(`Checking table: ${table.name}`);
            try {
                // Get existing columns
                const [results] = await sequelize.query(`PRAGMA table_info(${table.name})`);
                const existingColumns = results.map(r => r.name);
                
                for (const col of table.columns) {
                    if (!existingColumns.includes(col)) {
                        console.log(`Adding column ${col} to ${table.name}...`);
                        const type = col.includes('id') ? 'INTEGER' : 
                                     col.includes('is_') ? 'BOOLEAN DEFAULT 0' :
                                     col.includes('expires') ? 'DATETIME' : 'TEXT';
                        await sequelize.query(`ALTER TABLE ${table.name} ADD COLUMN ${col} ${type}`);
                    }
                }
            } catch (err) {
                console.error(`Failed to repair table ${table.name}:`, err.message);
            }
        }
        
        console.log('SQLite Schema Repair Complete.');
    } catch (err) {
        console.error('Repair FAILED:', err);
    } finally {
        process.exit();
    }
}

repairSqliteSchema();
