/**
 * Reminder / Schedule / Plan Routes — DRAVANUA HUB
 * ─────────────────────────────────────────────────────────────────
 * Full CRUD + broadcast email sender + department-level alert
 */

const express = require('express');
const router = express.Router();
const { Reminder, AdminUser, Department } = require('../models');
const { authMiddleware } = require('../middleware/authMiddleware');
const { Op } = require('sequelize');

router.use(authMiddleware);

// ── GET all reminders ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const user = req.user;
    const where = {};

    // Non-super-admins only see reminders for their department or broadcast
    if (user.role !== 'super_admin') {
      where[Op.or] = [
        { sendToAll: true },
        { department: user.assignedService || '' }
      ];
    }

    const reminders = await Reminder.findAll({
      where,
      include: [{ model: AdminUser, attributes: ['id', 'name', 'email'], required: false }],
      order: [['reminder_date', 'ASC'], ['created_at', 'DESC']]
    });

    res.json({ success: true, data: reminders });
  } catch (error) {
    console.error('Reminders fetch error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reminders.' });
  }
});

// ── GET today's due reminders (for bell badge) ────────────────────
router.get('/due-today', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const user = req.user;

    const where = {
      reminderDate: { [Op.lte]: today },
      status: 'Pending'
    };

    if (user.role !== 'super_admin') {
      where[Op.or] = [
        { sendToAll: true },
        { department: user.assignedService || '' }
      ];
    }

    const due = await Reminder.findAll({ where, order: [['reminder_date', 'ASC']] });
    res.json({ success: true, data: due, count: due.length });
  } catch (error) {
    console.error('Due reminders error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch due reminders.' });
  }
});

// ── POST create reminder ───────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const user = req.user;
    const {
      title, message, category, priority, department,
      sendToAll, recipient, reminderDate, reminderTime,
      dueDate, status, notes
    } = req.body;

    if (!title || !message || !reminderDate) {
      return res.status(400).json({ success: false, message: 'Title, Message, and Reminder Date are required.' });
    }

    const reminder = await Reminder.create({
      title, message, category: category || 'General',
      priority: priority || 'Medium',
      department: sendToAll ? 'All Departments' : (department || ''),
      sendToAll: !!sendToAll,
      recipient: recipient || '',
      reminderDate, reminderTime: reminderTime || null,
      dueDate: dueDate || null,
      status: status || 'Pending',
      notes: notes || '',
      createdBy: user?.name || 'Admin',
      user_id: user?.id,
      emailSent: false
    });

    res.status(201).json({ success: true, data: reminder, message: 'Reminder created successfully.' });
  } catch (error) {
    console.error('Reminder create error:', error);
    res.status(500).json({ success: false, message: error.message || 'Failed to create reminder.' });
  }
});

// ── PUT update reminder ────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  try {
    const reminder = await Reminder.findByPk(req.params.id);
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found.' });
    await reminder.update(req.body);
    res.json({ success: true, data: reminder, message: 'Reminder updated.' });
  } catch (error) {
    console.error('Reminder update error:', error);
    res.status(500).json({ success: false, message: 'Failed to update reminder.' });
  }
});

// ── DELETE reminder ────────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    const reminder = await Reminder.findByPk(req.params.id);
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found.' });
    await reminder.destroy();
    res.json({ success: true, message: 'Reminder deleted.' });
  } catch (error) {
    console.error('Reminder delete error:', error);
    res.status(500).json({ success: false, message: 'Failed to delete reminder.' });
  }
});

// ── POST mark as sent / completed ─────────────────────────────────
router.patch('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const reminder = await Reminder.findByPk(req.params.id);
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found.' });
    await reminder.update({ status });
    res.json({ success: true, message: `Reminder marked as ${status}.` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update status.' });
  }
});

// ── POST send reminder email ───────────────────────────────────────
router.post('/send-email/:id', async (req, res) => {
  try {
    const reminder = await Reminder.findByPk(req.params.id);
    if (!reminder) return res.status(404).json({ success: false, message: 'Reminder not found.' });

    const { sendEmail } = require('../utils/sendEmail');

    // Determine recipients
    let recipients = [];
    if (reminder.sendToAll) {
      // Fetch all admin user emails
      const allAdmins = await AdminUser.findAll({ attributes: ['email', 'name'], where: { isActive: true } });
      recipients = allAdmins.filter(a => a.email).map(a => ({ name: a.name, email: a.email }));
    } else if (reminder.recipient) {
      recipients = [{ name: reminder.recipient, email: req.body.recipientEmail || reminder.recipient }];
    }

    if (recipients.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid recipient found. Please specify a recipient email.' });
    }

    const priorityColor = {
      Urgent: '#dc2626', High: '#b45309', Medium: '#0369a1', Low: '#16a34a'
    }[reminder.priority] || '#1B5E20';

    const priorityBg = {
      Urgent: '#fef2f2', High: '#fffbeb', Medium: '#eff6ff', Low: '#f0fdf4'
    }[reminder.priority] || '#f0fdf4';

    const htmlBody = `
      <div style="font-family: 'Segoe UI', Inter, sans-serif; max-width: 640px; margin: 0 auto; background: #f8fafc;">
        <div style="background: linear-gradient(135deg, #0D3B0D, #1B5E20); padding: 28px 32px; border-radius: 16px 16px 0 0;">
          <div style="color: rgba(255,255,255,0.7); font-size: 11px; font-weight: 800; letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 8px;">DRAVANUA HUB — REMINDER ALERT</div>
          <h1 style="color: white; margin: 0; font-size: 22px; font-weight: 900;">${reminder.title}</h1>
          <div style="display: flex; gap: 12px; margin-top: 12px; flex-wrap: wrap;">
            <span style="background: ${priorityBg}; color: ${priorityColor}; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 900;">${reminder.priority} Priority</span>
            <span style="background: rgba(255,255,255,0.15); color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700;">${reminder.category}</span>
            ${reminder.sendToAll ? '<span style="background: rgba(255,255,255,0.15); color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700;">📢 All Departments</span>' : ''}
          </div>
        </div>
        <div style="background: white; padding: 28px 32px;">
          <div style="background: #f8fafc; border-left: 4px solid #1B5E20; padding: 18px 20px; border-radius: 0 12px 12px 0; margin-bottom: 24px;">
            <div style="font-size: 12px; font-weight: 800; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Message</div>
            <p style="margin: 0; color: #1e293b; font-size: 15px; line-height: 1.7; font-weight: 500;">${reminder.message}</p>
          </div>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 12px; font-weight: 800; width: 140px;">📅 Reminder Date</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #1e293b;">${reminder.reminderDate}${reminder.reminderTime ? ' at ' + reminder.reminderTime : ''}</td>
            </tr>
            ${reminder.dueDate ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 12px; font-weight: 800;">⏰ Due Date</td><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #dc2626;">${reminder.dueDate}</td></tr>` : ''}
            <tr>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 12px; font-weight: 800;">🏢 Department</td>
              <td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #1e293b;">${reminder.sendToAll ? 'All Departments' : (reminder.department || '—')}</td>
            </tr>
            ${reminder.recipient ? `<tr><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; color: #64748b; font-size: 12px; font-weight: 800;">👤 Recipient</td><td style="padding: 10px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; color: #1e293b;">${reminder.recipient}</td></tr>` : ''}
            <tr>
              <td style="padding: 10px 0; color: #64748b; font-size: 12px; font-weight: 800;">✍️ Created By</td>
              <td style="padding: 10px 0; font-weight: 700; color: #1e293b;">${reminder.createdBy || 'Admin'}</td>
            </tr>
          </table>
          ${reminder.notes ? `<div style="margin-top: 20px; padding: 14px 18px; background: #fffbeb; border-radius: 10px; border: 1px solid #fde68a;"><div style="font-size: 11px; font-weight: 800; color: #92400e; margin-bottom: 6px;">📝 NOTES</div><p style="margin: 0; color: #78350f; font-size: 13px; line-height: 1.6;">${reminder.notes}</p></div>` : ''}
        </div>
        <div style="background: #f8fafc; padding: 16px 32px; border-radius: 0 0 16px 16px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="margin: 0; color: #94a3b8; font-size: 11px; font-weight: 600;">DRAVANUA HUB · Kigali, Rwanda · Confidential Internal Communication</p>
        </div>
      </div>
    `;

    let successCount = 0;
    let lastError = null;

    for (const recip of recipients) {
      const result = await sendEmail({
        to: recip.email,
        subject: `🔔 [${reminder.priority}] ${reminder.title} — DRAVANUA HUB Reminder`,
        html: htmlBody
      });
      if (result.success) successCount++;
      else lastError = result.error;
    }

    if (successCount > 0) {
      await reminder.update({ emailSent: true, status: 'Sent' });
      res.json({ success: true, message: `Reminder sent to ${successCount} recipient${successCount > 1 ? 's' : ''}.` });
    } else {
      res.status(500).json({ success: false, message: lastError || 'Failed to send reminder email.' });
    }
  } catch (error) {
    console.error('Reminder send email error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
