const { sequelize } = require('../config/db');
const { Attendance, AdminUser } = require('../models/index');

async function checkTable() {
    try {
        await sequelize.authenticate();
        console.log("Connected to PostgreSQL database...");
        
        const [results, metadata] = await sequelize.query(
            "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'attendance'"
        );
        console.log("--- TABLE INFO (attendance) ---");
        console.log(JSON.stringify(results, null, 2));
        
        try {
            const count = await Attendance.count({
                include: [{ model: AdminUser }]
            });
            console.log("\nTotal Records (with AdminUser include):", count);
        } catch (e) {
            console.log("\nFailed to count Attendance with include:", e.message);
            
            try {
                const rawCount = await Attendance.count();
                console.log("Raw Attendance count (no include):", rawCount);
            } catch (e2) {
                console.log("Raw Attendance count also failed:", e2.message);
            }
        }
        
        process.exit(0);
    } catch (err) {
        console.error("DEBUG ERROR:", err);
        process.exit(1);
    }
}

checkTable();
