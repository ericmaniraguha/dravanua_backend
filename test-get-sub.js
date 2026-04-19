const { Subscription, AdminUser } = require('./models');

async function testGet() {
  try {
    const subs = await Subscription.findAll({
      order: [["next_billing_date", "ASC"]],
      include: [{ model: AdminUser, attributes: ["id", "name", "email"] }],
    });
    console.log("Found:", subs.length);
  } catch (error) {
    console.error("Fetch error:", error);
  }
  process.exit();
}
testGet();
