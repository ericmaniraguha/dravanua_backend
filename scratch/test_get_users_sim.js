const { AdminUser, Department } = require('../models/index');
const { Op } = require('sequelize');

async function testGetUsersSim() {
    try {
        // Simulate a service_admin from Studio (dept ID 1)
        const mockUser = { role: 'service_admin', departmentId: 1 };
        
        let where = {};
        if (mockUser.role !== "super_admin" && mockUser.departmentId) {
            where = {
                [Op.or]: [
                    { departmentId: mockUser.departmentId },
                    { role: "super_admin" },
                ],
            };
        }

        console.log('Testing AdminUser.findAll with where:', JSON.stringify(where));
        const users = await AdminUser.findAll({
            where,
            attributes: { exclude: ["password", "confirmationToken"] },
            order: [
                ["role", "ASC"], // Super admins first
                ["name", "ASC"],
            ],
            // include: [Department] // Just in case it needs it
        });
        console.log('Success! Found', users.length, 'users.');
        users.forEach(u => console.log(`- ${u.name} (${u.role}) Dept: ${u.departmentId}`));
    } catch (error) {
        console.error('FAILED:', error);
    } finally {
        process.exit();
    }
}

testGetUsersSim();
