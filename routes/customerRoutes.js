const express = require('express');
const router = express.Router();
const { customerSignup, customerLogin, getMyBookings } = require('../controllers/customerController');
const { authMiddleware } = require('../middleware/authMiddleware');

router.post('/signup', customerSignup);
router.post('/login', customerLogin);
router.get('/bookings', authMiddleware, getMyBookings);

module.exports = router;
