const { sequelize } = require("../config/db");

// Initialize models properly
const AdminUser = require("./AdminUser")(sequelize);
const ActivityLog = require("./ActivityLog")(sequelize);
const Attendance = require("./Attendance")(sequelize);
const Booking = require("./Booking")(sequelize);
const Customer = require("./Customer")(sequelize);
const DailyFloat = require("./DailyFloat")(sequelize);
const DailyReport = require("./DailyReport")(sequelize);
const Expense = require("./Expense")(sequelize);
const Gallery = require("./Gallery")(sequelize);
const LocationHistory = require("./LocationHistory")(sequelize);
const MarketingAsset = require("./MarketingAsset")(sequelize);
const Message = require("./Message")(sequelize);
const OfficeLocation = require("./OfficeLocation")(sequelize);
const Purchase = require("./Purchase")(sequelize);
const ServiceModule = require("./ServiceModule")(sequelize);
const Transaction = require("./Transaction")(sequelize);
const Violation = require("./Violation")(sequelize);
const DailyRequest = require("./DailyRequest")(sequelize);
const Department = require("./Department")(sequelize);
const ReceiptDocument = require("./ReceiptDocument")(sequelize);
const Subscription = require("./Subscription")(sequelize);
const Reminder = require("./Reminder")(sequelize);
const TeamMember = require("./TeamMember")(sequelize);
const SalaryStructure = require("./SalaryStructure")(sequelize);
const PayrollRecord = require("./PayrollRecord")(sequelize);
const SalaryAdvance = require("./SalaryAdvance")(sequelize);
const OrgLoan = require("./OrgLoan")(sequelize);
const OrgSavings = require("./OrgSavings")(sequelize);
const OrgFinanceLog = require("./OrgFinanceLog")(sequelize);
const Operation = require("./Operation")(sequelize);
const Task = require("./Task")(sequelize);
const Item = require("./Item")(sequelize);
const Partner = require("./Partner")(sequelize);
const InventoryMovement = require("./InventoryMovement")(sequelize);
const Reference = require("./Reference")(sequelize);
const AssetCategory = require("./AssetCategory")(sequelize);
const Asset = require("./Asset")(sequelize);
const AssetMaintenance = require("./AssetMaintenance")(sequelize);
const AssetTransfer = require("./AssetTransfer")(sequelize);
const AssetAssignment = require("./AssetAssignment")(sequelize);
const AssetInventory = require("./AssetInventory")(sequelize);
const MessageTemplate = require("./MessageTemplate")(sequelize);
const TreasuryPosition = require("./TreasuryPosition")(sequelize);


const models = [
  AdminUser, ActivityLog, Attendance, Booking, DailyReport,
  Expense, Purchase, DailyRequest, DailyFloat, MarketingAsset,
  Gallery, Message, Transaction, ReceiptDocument, Subscription,
  Reminder, Operation, Task, Item, Partner, InventoryMovement,
  Reference, ServiceModule, AssetCategory, Asset, AssetMaintenance,
  AssetTransfer, AssetAssignment, AssetInventory, MessageTemplate, TreasuryPosition

];

// --- ASSOCIATIONS ---

// Departments (Central Lookup)
models.forEach((Model) => {
  Department.hasMany(Model, { foreignKey: "department_id" });
  Model.belongsTo(Department, { foreignKey: "department_id" });
});

// Admin Users (Staff/Owners)
Attendance.belongsTo(AdminUser, { foreignKey: 'user_id' });
AdminUser.hasMany(Attendance, { foreignKey: 'user_id' });

DailyReport.belongsTo(AdminUser, { foreignKey: 'user_id' });
AdminUser.hasMany(DailyReport, { foreignKey: 'user_id' });

Expense.belongsTo(AdminUser, { foreignKey: 'user_id' });
AdminUser.hasMany(Expense, { foreignKey: 'user_id' });

Purchase.belongsTo(AdminUser, { foreignKey: 'user_id' });
AdminUser.hasMany(Purchase, { foreignKey: 'user_id' });

DailyRequest.belongsTo(AdminUser, { foreignKey: 'user_id' });
AdminUser.hasMany(DailyRequest, { foreignKey: 'user_id' });

DailyFloat.belongsTo(AdminUser, { foreignKey: 'user_id' });
AdminUser.hasMany(DailyFloat, { foreignKey: 'user_id' });

LocationHistory.belongsTo(AdminUser, { foreignKey: 'user_id' });
AdminUser.hasMany(LocationHistory, { foreignKey: 'user_id' });

Transaction.belongsTo(AdminUser, { foreignKey: 'user_id' });
AdminUser.hasMany(Transaction, { foreignKey: 'user_id' });

Gallery.belongsTo(AdminUser, { foreignKey: 'user_id' });
AdminUser.hasMany(Gallery, { foreignKey: 'user_id' });

MarketingAsset.belongsTo(AdminUser, { foreignKey: 'user_id' });
AdminUser.hasMany(MarketingAsset, { foreignKey: 'user_id' });

Subscription.belongsTo(AdminUser, { foreignKey: 'user_id' });
AdminUser.hasMany(Subscription, { foreignKey: 'user_id' });

Reminder.belongsTo(AdminUser, { foreignKey: 'user_id' });
AdminUser.hasMany(Reminder, { foreignKey: 'user_id' });

TeamMember.belongsTo(AdminUser, { foreignKey: 'admin_user_id', as: 'AdminUserAccount' });
AdminUser.hasOne(TeamMember, { foreignKey: 'admin_user_id', as: 'WebsiteProfile' });

// Payroll & Salary
AdminUser.hasOne(SalaryStructure, { foreignKey: 'user_id', as: 'SalaryStructure' });
SalaryStructure.belongsTo(AdminUser, { foreignKey: 'user_id' });

AdminUser.hasMany(PayrollRecord, { foreignKey: 'user_id' });
PayrollRecord.belongsTo(AdminUser, { foreignKey: 'user_id' });

AdminUser.hasMany(SalaryAdvance, { foreignKey: 'user_id' });
SalaryAdvance.belongsTo(AdminUser, { foreignKey: 'user_id' });

OrgLoan.hasMany(OrgFinanceLog, { foreignKey: 'loan_id' });
OrgFinanceLog.belongsTo(OrgLoan, { foreignKey: 'loan_id' });

OrgSavings.hasMany(OrgFinanceLog, { foreignKey: 'savings_id' });
OrgFinanceLog.belongsTo(OrgSavings, { foreignKey: 'savings_id' });

ReceiptDocument.belongsTo(AdminUser, { as: 'Uploader', foreignKey: 'uploaded_by' });
ReceiptDocument.belongsTo(AdminUser, { as: 'Approver', foreignKey: 'approved_by' });

// Messages (Sender/Receiver)
Message.belongsTo(AdminUser, { as: 'Sender', foreignKey: 'sender_id' });
Message.belongsTo(AdminUser, { as: 'Receiver', foreignKey: 'receiver_id' });
AdminUser.hasMany(Message, { as: 'SentMessages', foreignKey: 'sender_id' });
AdminUser.hasMany(Message, { as: 'ReceivedMessages', foreignKey: 'receiver_id' });

// Attendance Tracking
LocationHistory.belongsTo(Attendance, { foreignKey: 'attendance_id' });
Attendance.hasMany(LocationHistory, { foreignKey: 'attendance_id' });

// Bookings & Customers
Booking.belongsTo(Customer, { foreignKey: 'customer_id' });
Customer.hasMany(Booking, { foreignKey: 'customer_id' });

// Inventory
Item.hasMany(InventoryMovement, { foreignKey: 'itemId' });
InventoryMovement.belongsTo(Item, { foreignKey: 'itemId' });

// --- ASSET MODULE ASSOCIATIONS ---

// Asset <-> Category
Asset.belongsTo(AssetCategory, { foreignKey: 'category_id' });
AssetCategory.hasMany(Asset, { foreignKey: 'category_id' });

// Asset <-> Department
Asset.belongsTo(Department, { foreignKey: 'department_id' });
Department.hasMany(Asset, { foreignKey: 'department_id' });

// Asset <-> AdminUser (Assigned To)
Asset.belongsTo(AdminUser, { as: 'Assignee', foreignKey: 'assigned_to' });
Asset.belongsTo(AdminUser, { as: 'Recorder', foreignKey: 'recorded_by' });
Asset.belongsTo(AdminUser, { as: 'Modifier', foreignKey: 'modified_by' });
AdminUser.hasMany(Asset, { foreignKey: 'assigned_to' });

// Asset Maintenance
Asset.hasMany(AssetMaintenance, { foreignKey: 'asset_id' });
AssetMaintenance.belongsTo(Asset, { foreignKey: 'asset_id' });
AssetMaintenance.belongsTo(AdminUser, { as: 'Recorder', foreignKey: 'recorded_by' });
AssetMaintenance.belongsTo(AdminUser, { as: 'Modifier', foreignKey: 'modified_by' });

// Asset Transfers
Asset.hasMany(AssetTransfer, { foreignKey: 'asset_id' });
AssetTransfer.belongsTo(Asset, { foreignKey: 'asset_id' });
AssetTransfer.belongsTo(Department, { as: 'FromDepartment', foreignKey: 'from_department_id' });
AssetTransfer.belongsTo(Department, { as: 'ToDepartment', foreignKey: 'to_department_id' });
AssetTransfer.belongsTo(AdminUser, { as: 'Requester', foreignKey: 'requested_by' });
AssetTransfer.belongsTo(AdminUser, { as: 'Approver', foreignKey: 'approved_by' });
AssetTransfer.belongsTo(AdminUser, { as: 'Recorder', foreignKey: 'recorded_by' });
AssetTransfer.belongsTo(AdminUser, { as: 'Modifier', foreignKey: 'modified_by' });

// Asset Assignments
Asset.hasMany(AssetAssignment, { foreignKey: 'asset_id' });
AssetAssignment.belongsTo(Asset, { foreignKey: 'asset_id' });
AssetAssignment.belongsTo(AdminUser, { as: 'Employee', foreignKey: 'employee_id' });

// Asset Inventory
Asset.hasOne(AssetInventory, { foreignKey: 'asset_id' });
AssetInventory.belongsTo(Asset, { foreignKey: 'asset_id' });

// Category <-> Department
AssetCategory.belongsTo(Department, { foreignKey: 'department_id' });
Department.hasMany(AssetCategory, { foreignKey: 'department_id' });

module.exports = {
  AdminUser,
  ActivityLog,
  Attendance,
  Booking,
  Customer,
  DailyFloat,
  DailyReport,
  Expense,
  Gallery,
  LocationHistory,
  MarketingAsset,
  Message,
  OfficeLocation,
  Purchase,
  ServiceModule,
  Transaction,
  Violation,
  DailyRequest,
  Department,
  ReceiptDocument,
  Subscription,
  Reminder,
  TeamMember,
  SalaryStructure,
  PayrollRecord,
  SalaryAdvance,
  OrgLoan,
  OrgSavings,
  OrgFinanceLog,
  Operation,
  Task,
  Item,
  Partner,
  InventoryMovement,
  Reference,
  AssetCategory,
  Asset,
  AssetMaintenance,
  AssetTransfer,
  AssetAssignment,
  AssetInventory,
  MessageTemplate,
  TreasuryPosition
};

