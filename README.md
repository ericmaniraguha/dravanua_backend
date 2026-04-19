# ⚙️ DRAVANUA HUB - Backend API

The backend for DRAVANUA HUB is a robust Node.js/Express server that serves as the central orchestration layer for all business logic, secure authentication, financial intelligence, and database interactions.

---

## 🛠️ Technology Stack

- **Runtime**: Node.js (v20+)
- **Framework**: Express.js (v5.x)
- **ORM**: Sequelize (v6.x) — PostgreSQL / MySQL / SQLite support
- **Auth**: BcryptJS (Password Hashing) & JSON Web Tokens (JWT)
- **Email**: Nodemailer (SMTP Integration)
- **Files**: Multer (Local Upload Management)

---

## 🚀 Scripts & Execution

| Command | Description |
| :--- | :--- |
| `npm run dev` | Launches dev server with `nodemon` and auto-syncs schema. |
| `npm start` | Production start command. |
| `npm run db:migrate` | Executes all pending timestamp-based migrations. |
| `npm run db:migrate:undo` | Reverts the most recent migration. |
| `npm run migration:generate -- --name <name>` | Generates a new migration skeleton in `migrations/`. |

---

## 🗄️ Database Management & Migrations

The platform employs a dual-strategy for database evolution:

1.  **Development Development**: Uses `{ alter: true }` in `server.js` to automatically keep the database in sync with your JS models for rapid iteration.
2.  **Production Stability**: Uses **Sequelize CLI Migrations** with a timestamp-based naming convention (`YYYYMMDDHHmmss-name.js`). All structural changes (indices, constraints, new columns) are version-controlled in the `/migrations` directory.

### Configuration
Managed via **`.sequelizerc`** and **`config/config.js`**, ensuring that environment variables from your `.env` are used for all CLI operations.

---

## 🛡️ Model-Level Protection (Exception Handling)

We have implemented an aggressive exception-handling layer directly on the models to guarantee data integrity:

*   **Custom Validations**: Fields like `email` have custom uniqueness error messages, while financial fields (`totalAmount`, `netAmount`) have `min: 0` constraints.
*   **Lifecycle Hardening**: Hooks such as `beforeCreate` (for `AdminUser`) and `beforeSave` (for `PayrollRecord`) are wrapped in `try/catch` blocks. If an automated calculation or hashing operation fails, it throws a descriptive business exception rather than a generic DB error.
*   **Automatic Logic**:
    *   **Staff Codes**: `AdminUser` automatically generates codes like `EMP-2026-0001` on creation.
    *   **Net Payroll**: `PayrollRecord` automatically reconciles base salary, allowances, and deductions before saving.

---

## 📡 Core API Structure

- **/api/v1/auth**: JWT-based login, refresh token rotation, and logout.
- **/api/v1/admin**:
    - `User Management`: RBAC control, email invitations, and staff activation.
    - `Payroll`: Compensation tracking and financial ledger integration.
    - `Operations`: Managed trackers for Reports, Daily Floats, and Procurement.
    - `Subscriptions`: Recurring cost auditing and burn-rate analytics.
- **/api/v1/public**: Metadata, Gallery, and Public Service information.

---

## 🔒 Security & Audit

- **RBAC**: Access is restricted via `authMiddleware` checking JWT roles.
- **Audit Logs**: The `ActivityLog` model captures every administrative POST/PUT/DELETE request with a UUID reference to the performing user.
- **UUIDv4**: All keys in the database are 128-bit UUIDs, preventing ID enumeration attacks.

---
© 2026 DRAVANUA HUB • Backend Engineering
