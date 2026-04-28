/**
 * Subscription Management Routes — DRA VANUA GROUP LTD
 * ─────────────────────────────────────────────────────────────────────────────
 * Full CRUD + deadline alert engine for recurring subscriptions.
 */

const express = require("express");
const router = express.Router();
const { Op } = require("sequelize");
const { Subscription, AdminUser } = require("../models");

// ─── GET ALL SUBSCRIPTIONS ──────────────────────────────────────────────────
router.get("/", async (req, res) => {
  try {
    const { start, end } = req.query;
    const where = {};
    if (start && end) {
      where.createdAt = {
        [Op.between]: [start + " 00:00:00", end + " 23:59:59"],
      };
    }

    const subs = await Subscription.findAll({
      where,
      order: [["next_billing_date", "ASC"]],
      include: [{ model: AdminUser, attributes: ["id", "name", "email"] }],
    });
    res.json({ success: true, data: subs });
  } catch (error) {
    console.error("Subscriptions fetch error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── GET ALERTS (subscriptions due within N days) ───────────────────────────
router.get("/alerts", async (req, res) => {
  try {
    const today = new Date();
    const lookahead = new Date();
    lookahead.setDate(today.getDate() + 7); // default 7-day lookahead

    const alerts = await Subscription.findAll({
      where: {
        status: "Active",
        nextBillingDate: {
          [Op.between]: [
            today.toISOString().split("T")[0],
            lookahead.toISOString().split("T")[0],
          ],
        },
      },
      order: [["next_billing_date", "ASC"]],
    });

    res.json({ success: true, data: alerts });
  } catch (error) {
    console.error("Subscription alerts error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── CREATE SUBSCRIPTION ────────────────────────────────────────────────────
router.post("/", async (req, res) => {
  try {
    const {
      name,
      category,
      plan,
      billingCycle,
      cost,
      currency,
      paymentMethod,
      accountSource,
      startDate,
      nextBillingDate,
      autoRenewal,
      status,
      notes,
      alertDaysBefore,
    } = req.body;

    if (!name || !startDate || !nextBillingDate) {
      return res.status(400).json({
        success: false,
        message: "Name, Start Date, and Next Billing Date are required.",
      });
    }

    const sub = await Subscription.create({
      name,
      category: category || "General",
      plan,
      billingCycle: billingCycle || "Monthly",
      cost: cost || 0,
      currency: currency || "RWF",
      paymentMethod,
      accountSource,
      startDate,
      nextBillingDate,
      autoRenewal: autoRenewal !== undefined ? autoRenewal : true,
      status: status || "Active",
      notes,
      alertDaysBefore: alertDaysBefore || 3,
      userId: req.user.id,
      departmentId: req.user.departmentId || null,
    });

    res.status(201).json({ success: true, data: sub });
  } catch (error) {
    console.error("Subscription create error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── UPDATE SUBSCRIPTION ────────────────────────────────────────────────────
router.put("/:id", async (req, res) => {
  try {
    const sub = await Subscription.findByPk(req.params.id);
    if (!sub) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found." });
    }

    await sub.update(req.body);
    res.json({ success: true, data: sub });
  } catch (error) {
    console.error("Subscription update error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── DELETE SUBSCRIPTION ────────────────────────────────────────────────────
router.delete("/:id", async (req, res) => {
  try {
    const sub = await Subscription.findByPk(req.params.id);
    if (!sub) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found." });
    }

    await sub.destroy();
    res.json({ success: true, message: "Subscription deleted." });
  } catch (error) {
    console.error("Subscription delete error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ─── SEND ALERT EMAIL ───────────────────────────────────────────────────────
router.post("/send-alert/:id", async (req, res) => {
  try {
    const sub = await Subscription.findByPk(req.params.id);
    if (!sub) {
      return res
        .status(404)
        .json({ success: false, message: "Subscription not found." });
    }

    const { sendEmail } = require("../utils/sendEmail");
    const recipientEmail = req.body.email || req.user.email;

    const result = await sendEmail({
      to: recipientEmail,
      subject: `[DRA VANUA GROUP LTD] Subscription Renewal Alert: ${sub.name}`,
      text: `Your subscription "${sub.name}" (${sub.plan || sub.category}) is due on ${sub.nextBillingDate}. Amount: ${Number(sub.cost).toLocaleString()} ${sub.currency}.`,
      html: `
        <div style="font-family:'Inter',sans-serif;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;border-radius:16px;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#32FC05,#2E7D32);padding:24px;color:white;">
            <h2 style="margin:0;font-size:18px;">🔔 Subscription Renewal Alert</h2>
            <p style="opacity:0.85;margin:8px 0 0;font-size:13px;">DRA VANUA GROUP LTD — Financial Operations</p>
          </div>
          <div style="padding:24px;">
            <table style="width:100%;border-collapse:collapse;">
              <tr><td style="padding:10px 0;color:#64748b;font-weight:600;width:140px;">Subscription</td><td style="font-weight:800;">${sub.name}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b;font-weight:600;">Plan</td><td>${sub.plan || "—"}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b;font-weight:600;">Category</td><td>${sub.category}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b;font-weight:600;">Billing Cycle</td><td>${sub.billingCycle}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b;font-weight:600;">Amount Due</td><td style="font-weight:800;color:#32FC05;">${Number(sub.cost).toLocaleString()} ${sub.currency}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b;font-weight:600;">Next Billing</td><td style="font-weight:800;color:#dc2626;">${sub.nextBillingDate}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b;font-weight:600;">Auto Renewal</td><td>${sub.autoRenewal ? "✅ Yes" : "❌ No"}</td></tr>
              <tr><td style="padding:10px 0;color:#64748b;font-weight:600;">Payment Method</td><td>${sub.paymentMethod || "—"}</td></tr>
            </table>
            <div style="margin-top:20px;padding:14px;background:#fef3c7;border-radius:10px;border:1px solid #fde68a;">
              <p style="margin:0;color:#92400e;font-weight:700;font-size:13px;">⚠️ Please ensure sufficient funds are available before the billing date to avoid interruptions.</p>
            </div>
          </div>
          <div style="background:#f8fafc;padding:14px 24px;border-top:1px solid #e2e8f0;font-size:11px;color:#94a3b8;text-align:center;">
            Automated alert from DRA VANUA GROUP LTD Treasury System
          </div>
        </div>
      `,
    });

    if (result.success) {
      await sub.update({ alertSent: true });
      res.json({ success: true, message: `Alert sent to ${recipientEmail}` });
    } else {
      res.status(500).json({
        success: false,
        message: result.error || "Failed to send alert.",
      });
    }
  } catch (error) {
    console.error("Subscription alert send error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
