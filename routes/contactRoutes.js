const express = require('express');
const router = express.Router();
const { submitContact, getMessages, markAsRead, deleteMessage, replyToMessage, updateMessageStatus, updateMessage } = require('../controllers/contactController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Public route — submit contact form
router.post('/', submitContact);

// Admin routes (protected)
router.get('/', authMiddleware, getMessages);
router.patch('/:id/read', authMiddleware, markAsRead);
router.patch('/:id/status', authMiddleware, updateMessageStatus);
router.put('/:id', authMiddleware, updateMessage);
router.post('/:id/reply', authMiddleware, replyToMessage);
router.delete('/:id', authMiddleware, deleteMessage);

module.exports = router;
