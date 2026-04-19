const Customer = require('../models/Customer');
const Booking = require('../models/Booking');
const jwt = require('jsonwebtoken');

// POST /api/v1/customer/signup
const customerSignup = async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;
    
    const existing = await Customer.findOne({ where: { email } });
    if (existing && existing.password) {
      return res.status(400).json({ error: "Email already registered" });
    }

    if (existing) {
      // If customer existed as a walk-in/lead, upgrade them
      existing.name = name;
      existing.password = password;
      existing.phone = phone;
      await existing.save();
      return res.status(200).json({ success: true, message: "Account activated" });
    }

    const customer = await Customer.create({ name, email, password, phone, channel: 'Website' });
    res.status(201).json({ success: true, data: customer });
  } catch (error) {
    res.status(500).json({ error: "Signup failed" });
  }
};

// POST /api/v1/customer/login
const customerLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const customer = await Customer.findOne({ where: { email } });
    
    if (!customer || !customer.password) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const isMatch = await customer.comparePassword(password);
    if (!isMatch) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { id: customer.id, email: customer.email, type: 'customer' },
      process.env.JWT_SECRET || 'dravanua-jwt-secret-key',
      { expiresIn: '30d' }
    );

    res.json({ success: true, token, user: { id: customer.id, name: customer.name, email: customer.email } });
  } catch (error) {
    res.status(500).json({ error: "Login failed" });
  }
};

// GET /api/v1/customer/bookings
const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.findAll({ 
      where: { customerEmail: req.user.email },
      order: [['bookingDate', 'DESC']]
    });
    res.json({ success: true, data: bookings });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch bookings" });
  }
};

module.exports = {
  customerSignup,
  customerLogin,
  getMyBookings
};
