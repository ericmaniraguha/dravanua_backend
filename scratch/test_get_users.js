const { AdminUser } = require('../models/index');
const { Op } = require('sequelize');

async function testGetUsers() {
    try {
        console.log('Testing AdminUser.findAll()...');
        const users = await AdminUser.findAll({
            attributes: { exclude: ["password", "confirmationToken"] },
            order: [
                ["role", "ASC"],
                ["name", "ASC"],
            ],
        });
        console.log('Success! Found', users.length, 'users.');
    } catch (error) {
        console.error('FAILED:', error);
    } finally {
        process.exit();
    }
}

testGetUsers();
