const Message = require("../models/Message");
const AdminUser = require("../models/AdminUser");
const { sendEmail } = require("../utils/sendEmail");

// POST /api/v1/contact — Submit contact form (public)
const submitContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;

    // Validate required fields
    if (!name || !email || !subject || !message) {
      return res.status(400).json({ error: "All fields are required" });
    }

    const Department = require("../models/Department");
    let departmentId = null;

    // Naively map service subjects to department IDs for inbox sorting
    if (subject) {
      try {
        if (subject.includes("Studio"))
          departmentId = await Department.resolveId("Studio");
        else if (
          subject.includes("Stationery") ||
          subject.includes("Papeterie")
        )
          departmentId = await Department.resolveId("Papeterie");
        else if (subject.includes("Flower"))
          departmentId = await Department.resolveId("Flower Gifts");
        else if (subject.includes("Fashion"))
          departmentId = await Department.resolveId("Classic Fashion");
      } catch (e) {}
    }

    // Save message to database — mapped to normalized Message model fields
    const newMessage = await Message.create({
      senderName: name,
      senderEmail: email,
      subject,
      departmentId,
      content: message, // 'message' body → normalized 'content' column
    });

    // Send notification email to admin
    await sendEmail({
      to: process.env.SMTP_FROM,
      subject: `[DRAVANUA HUB] New Contact: ${subject}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
          <div style="background: #32FC05; padding: 20px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 24px;">DRAVANUA HUB</h1>
            <p style="margin: 10px 0 0; font-size: 14px;">New Contact Form Submission</p>
          </div>
          <div style="padding: 30px; line-height: 1.6; color: #333;">
            <h2 style="color: #32FC05; margin-top: 0;">New Inquiry Received</h2>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p><strong>Name:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Subject:</strong> ${subject}</p>
            <p><strong>Message:</strong></p>
            <div style="background: #f8fafc; padding: 16px; border-radius: 8px; border-left: 4px solid #32FC05;">
              ${message}
            </div>
            <hr style="border: none; border-top: 1px solid #eee; margin-top: 24px;" />
            <p style="color: #64748b; font-size: 13px;">This message was sent via the DRAVANUA HUB website contact form.</p>
            <p style="color: #64748b; font-size: 13px;">Timestamp: ${new Date().toLocaleString()}</p>
          </div>
          <div style="background: #f4f4f4; padding: 15px; text-align: center; color: #888; font-size: 12px;">
            DRAVANUA HUB • Here to Create • Kigali, Rwanda
          </div>
        </div>
      `,
      text: `New contact from ${name} (${email})\nSubject: ${subject}\nMessage: ${message}`,
    });

    // Auto-reply to user: Thank you confirmation
    await sendEmail({
      to: email,
      subject: `Thank you for contacting DRAVANUA HUB — We've received your message`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #32FC05, #2E7D32); padding: 32px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">DRAVANUA HUB</h1>
            <p style="margin: 8px 0 0; font-size: 14px; opacity: 0.85;">Fine Art, Design & Creative Hub • Kigali</p>
          </div>

          <div style="padding: 36px 32px; color: #333; line-height: 1.7;">
            <h2 style="color: #32FC05; margin: 0 0 12px; font-size: 20px;">Thank you, ${name}! 🙏</h2>
            <p style="margin: 0 0 20px; font-size: 15px; color: #475569;">
              We've received your message and are glad you reached out to us.
            </p>

            <div style="background: #f0fdf4; border: 1px solid #bbf7d0; border-left: 4px solid #16a34a; border-radius: 8px; padding: 20px; margin: 24px 0;">
              <p style="margin: 0; font-size: 15px; color: #15803d; font-weight: 600;">
                ✅ Your message has been received successfully.
              </p>
              <p style="margin: 8px 0 0; font-size: 14px; color: #166534;">
                One of our team members will get back to you <strong>no later than 24 hours</strong>.
              </p>
            </div>

            <p style="font-size: 14px; color: #64748b; border-top: 1px solid #f1f5f9; padding-top: 16px; margin-top: 24px;">
              Your inquiry: <strong>${subject}</strong>
            </p>

            <p style="margin-top: 24px; font-size: 15px;">Best regards,</p>
            <p style="margin: 4px 0; font-weight: 700; color: #32FC05;">The DRAVANUA HUB Team</p>
          </div>

          <div style="background: #f8fafc; padding: 16px; text-align: center; color: #94a3b8; font-size: 12px; border-top: 1px solid #e2e8f0;">
            DRAVANUA HUB • Kigali, Rwanda • info@dravanuahub.com
          </div>
        </div>
      `,
      text: `Hi ${name},\n\nThank you for contacting DRAVANUA HUB!\n\nWe have received your message about "${subject}" and will get back to you no later than 24 hours.\n\nBest regards,\nThe DRAVANUA HUB Team\nKigali, Rwanda`,
    });

    res.status(201).json({
      success: true,
      message: "Your message has been sent successfully!",
      data: newMessage,
    });
  } catch (error) {
    console.error("Contact submission error:", error);
    res
      .status(500)
      .json({ error: "Failed to send message. Please try again." });
  }
};

// GET /api/v1/contact — Get all messages (admin)
const getMessages = async (req, res) => {
  try {
    const whereClause = {};
    if (
      req.user &&
      req.user.role !== "super_admin" &&
      req.user.departmentId &&
      req.user.departmentId !== "all"
    ) {
      whereClause.departmentId = req.user.departmentId;
    }

    const messages = await Message.findAll({
      where: whereClause,
      include: [
        {
          model: AdminUser,
          as: "Sender",
          attributes: ["profilePicture", "name"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });
    res.json({ success: true, data: messages });
  } catch (error) {
    console.error("Fetch messages failed:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

// PATCH /api/v1/contact/:id/read — Mark message as read
const markAsRead = async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ error: "Message not found" });

    message.isRead = true; // Use normalized column
    await message.save();
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ error: "Failed to update message" });
  }
};

// DELETE /api/v1/contact/:id — Delete a message
const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ error: "Message not found" });

    await message.destroy();
    res.json({ success: true, message: "Message deleted" });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete message" });
  }
};

// POST /api/v1/contact/:id/reply — Admin replying to message
const replyToMessage = async (req, res) => {
  try {
    const { id } = req.params;
    const { replyText } = req.body;

    if (!replyText)
      return res.status(400).json({ error: "Reply text is required" });

    const message = await Message.findByPk(id);
    if (!message) return res.status(404).json({ error: "Message not found" });

    // Update message state — match existing model fields
    message.replied = true;
    message.isRead = true;
    message.status = "replied";
    message.replyContent = replyText;

    try {
      await message.save();
    } catch (saveErr) {
      console.warn("Could not save reply status to DB:", saveErr.message);
    }

    // Send email to customer
    const result = await sendEmail({
      to: message.senderEmail,
      subject: `[DRAVANUA HUB] Re: ${message.subject || "Inquiry Response"}`,
      html: `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 650px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 25px rgba(0,0,0,0.05);">
          <div style="background: linear-gradient(135deg, #32FC05, #2E7D32); padding: 30px; text-align: center; color: white;">
            <h1 style="margin: 0; font-size: 26px; font-weight: 900; letter-spacing: -0.5px;">DRAVANUA HUB</h1>
            <p style="margin: 10px 0 0; font-size: 14px; opacity: 0.9;">Professional Correspondence • Kigali, Rwanda</p>
          </div>
          <div style="padding: 40px 35px; line-height: 1.7; color: #1e293b;">
            <h2 style="color: #32FC05; margin-top: 0; font-size: 20px; font-weight: 800;">Hello ${message.senderName},</h2>
            <p style="font-size: 15px;">Thank you for reaching out to DRAVANUA. Our team has reviewed your inquiry, and here is our response:</p>
            
            <div style="background: #f8fafc; padding: 25px; border-radius: 12px; margin: 30px 0; border-left: 5px solid #32FC05; color: #334155;">
              <p style="margin: 0; white-space: pre-wrap; font-size: 16px;">${replyText}</p>
            </div>
            
            <p style="font-size: 15px; margin-bottom: 30px;">Should you have any further questions or require additional clarification, please feel free to reply directly to this email.</p>
            
            <div style="padding-top: 25px; border-top: 1px solid #f1f5f9;">
              <p style="margin: 0; font-weight: 800; color: #32FC05;">Best Regards,</p>
              <p style="margin: 4px 0; font-size: 14px; color: #64748b;">The DRAVANUA HUB Operations Team</p>
            </div>
          </div>
          
          <div style="background: #f8fafc; padding: 25px; font-size: 13px; color: #94a3b8; border-top: 1px solid #e2e8f0;">
             <p style="margin: 0 0 10px; font-weight: 900; color: #475569; text-transform: uppercase; letter-spacing: 0.5px;">Original Correspondence Context</p>
             <div style="opacity: 0.7;">
                <strong>Subject:</strong> ${message.subject || "N/A"}<br/>
                <strong>Message:</strong> "${message.content}"
             </div>
          </div>

          <div style="background: #f4f4f4; padding: 20px; text-align: center; color: #888; font-size: 11px;">
            DRAVANUA HUB • Fine Art, Studio & Creative Supplies • Kigali, Rwanda<br/>
            +250 788 000 000 • info@dravanua.com
          </div>
        </div>
      `,
      text: `Hello ${message.senderName},\n\n${replyText}\n\n---\nYour original inquiry about "${message.subject || "something"}" was: "${message.content}"\n\nBest regards,\nDRAVANUA HUB Team`,
    });

    if (!result.success) {
      return res.status(500).json({
        error: `Message resolved in DB, but email failed: ${result.error}`,
      });
    }

    res.json({ success: true, data: message });
  } catch (error) {
    console.error("Failed to reply:", error);
    res
      .status(500)
      .json({ error: "Failed to process reply. Ensure mailer is active." });
  }
};

// PATCH /api/v1/contact/:id/status — Admin manually override status
const updateMessageStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ error: "Message not found" });

    message.status = status;
    await message.save();
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ error: "Failed to update message status" });
  }
};

// PUT /api/v1/contact/:id — Admin manually edit content
const updateMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const message = await Message.findByPk(req.params.id);
    if (!message) return res.status(404).json({ error: "Message not found" });

    message.content = content;
    await message.save();
    res.json({ success: true, data: message });
  } catch (error) {
    res.status(500).json({ error: "Failed to update message content" });
  }
};

module.exports = {
  submitContact,
  getMessages,
  markAsRead,
  deleteMessage,
  replyToMessage,
  updateMessageStatus,
  updateMessage,
};
