const { Booking, Customer, Transaction, DailyReport, Expense, Purchase, Attendance } = require('../models/index');
const { Op } = require('sequelize');

async function testAnalytics() {
    try {
        console.log('Simulating getAnalytics...');
        const period = '30d';
        const now = new Date();
        const startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        const dateRange = { [Op.gte]: startDate };
        const dateWhere = { createdAt: dateRange };
        const baseWhere = {};

        console.log('1. Fetching Attendance...');
        await Attendance.findAll({
            where: {
                date: { [Op.gte]: startDate.toISOString().split("T")[0] }
            }
        });

        console.log('2. Fetching Bookings with Customer include...');
        const bookings = await Booking.findAll({
            where: { ...baseWhere, ...dateWhere },
            include: [{ model: Customer, attributes: ["id", "name", "email"] }],
        });

        console.log('3. Fetching Transactions...');
        await Transaction.findAll({ where: dateWhere });

        console.log('4. Fetching Daily Operations...');
        await DailyReport.findAll({ where: dateWhere });
        await Expense.findAll({ where: dateWhere });
        await Purchase.findAll({ where: dateWhere });

        console.log('Success! Analytics queries passed.');
    } catch (error) {
        console.error('FAILED Analytics:', error);
    } finally {
        process.exit();
    }
}

testAnalytics();
