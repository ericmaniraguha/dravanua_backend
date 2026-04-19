const { Subscription } = require('./models');
const { sequelize } = require('./config/db');

async function createDummy() {
  await sequelize.sync(); // ensure tables
  try {
    const sub = await Subscription.create({
      name: 'Google Workspace',
      category: 'Cloud',
      plan: 'Business Plus',
      billingCycle: 'Monthly',
      cost: 15000,
      currency: 'RWF',
      startDate: new Date(),
      nextBillingDate: new Date(Date.now() + 30*24*60*60*1000),
      status: 'Active'
    });
    console.log("Created successfully:", sub.toJSON());
  } catch (err) {
    console.error("Error creating subscription:", err);
  }
  process.exit();
}

createDummy();
