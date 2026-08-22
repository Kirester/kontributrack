# KontribuTrack 📊

> **Transparent Financial Tracking & Member Payment Portal for Community Associations**  
> *Capstone MVP System built with Node.js, Express, MySQL, Vanilla JS, and iProgSMS Integration.*

---

## 📌 Project Overview

**KontribuTrack** is a lightweight, role-separated financial tracking application designed for community treasurers and organization officers. It streamlines monthly dues collection, maintains strict audit trails, provides a self-service status verification portal for members, and sends real-time SMS payment confirmations.

---

## ✨ Key Features

### 🛡️ 1. Officer / Treasurer Dashboard
- **Protected Access:** Session-authenticated login portal guarded by `bcryptjs` password hashing.
- **Member Management:** Add new organization members with custom monthly dues and hashed self-check PINs.
- **Audit-Compliant Payment Logging:** Records `member_id`, `amount`, `date_paid`, `logged_by` (authenticated officer identity), and UTC `timestamp` for every transaction.
- **Duplicate Prevention:** Detection algorithm flags existing payments logged for the same member in the current billing cycle with an optional officer override switch.
- **Member ID Cards & QR Printing:** Generates printable physical member ID cards with embedded status-verification QR codes for individual members or full-roster batch printing.

### 📱 2. Public Member Self-Check Portal
- **Independent Self-Service:** Completely isolated public portal allowing members to check their payment status without officer intervention.
- **PIN Verification Guard:** Requires valid Member ID and PIN before returning any contribution status.
- **Anti-Enumeration Protection:** Returns identical generic error payloads (`"Invalid Member ID or PIN."`) regardless of whether the ID is missing or the PIN is wrong.
- **Rate Limited:** Protected against brute-force attacks via `express-rate-limit` (maximum 5 requests per 15 minutes per IP address).

### 💬 3. Real-Time SMS Gateway (iProgSMS Integration)
- **Instant Payment Confirmations:** Automatically sends real-time confirmation SMS upon successful payment logging:
  > `KontribuTrack: Payment of PHP 500 received for August 2026. Thank you, Juan Dela Cruz.`
- **Phone Number Normalization:** Automatically standardizes input formats (`09XXXXXXXXX`, `9XXXXXXXXX`, `+639XXXXXXXXX`, `639XXXXXXXXX`) into 11-digit local format before API submission.
- **GSM 7-Bit Encoding Safety:** Uses `PHP` text instead of Unicode currency symbols (`₱`) to prevent character distortion (`?`) across Philippine telecom networks (Smart, Globe, DITO).
- **Graceful Fault Tolerance:** Asynchronous fire-and-forget implementation ensures SMS API errors or low credit balances never block or crash database payment transactions.

---

## 🔒 Security & Privacy Implementation

- **Zero Hardcoded Credentials:** Sensitive credentials (`IPROG_SMS_API_TOKEN`, `DB_PASSWORD`, `SESSION_SECRET`) are read exclusively from environment variables (`.env`).
- **Strict Git Ignore Rules:** `.env`, local database binaries (`*.db`), logs, and image assets (`*.png`, `*.jpg`, `*.webp`, `*.svg`) are excluded from repository commits.
- **SQL Injection Safeguards:** All database operations utilize parameterized queries (`?`) via `mysql2/promise`.
- **Role & Route Isolation:** Officer routes (`/api/officer/*`) are protected by explicit authentication middleware (`requireOfficerAuth`) and separated from public member routes (`/api/member/*`).
- **Media-Free Repository:** No image binaries are tracked in version control, keeping the repository light and clean.

---

## 🗄️ Database Schema

### `officers` Table
| Column | Type | Description |
|---|---|---|
| `id` | `INT AUTO_INCREMENT` | Primary key |
| `username` | `VARCHAR(100)` | Unique officer login username |
| `password` | `VARCHAR(255)` | Bcrypt hashed password |
| `name` | `VARCHAR(255)` | Full officer display name |

### `members` Table
| Column | Type | Description |
|---|---|---|
| `id` | `INT AUTO_INCREMENT` | Primary key / Member ID |
| `name` | `VARCHAR(255)` | Full member name |
| `contact_number` | `VARCHAR(50)` | Mobile phone number |
| `monthly_due` | `DECIMAL(10,2)` | Agreed monthly contribution amount |
| `pin` | `VARCHAR(255)` | Bcrypt hashed self-check PIN |

### `payments` Table (Audit Trail)
| Column | Type | Description |
|---|---|---|
| `id` | `INT AUTO_INCREMENT` | Primary key |
| `member_id` | `INT` | Foreign key referencing `members(id)` |
| `amount` | `DECIMAL(10,2)` | Payment amount logged |
| `date_paid` | `VARCHAR(50)` | Date of payment (`YYYY-MM-DD`) |
| `logged_by` | `VARCHAR(255)` | Name of officer who logged the payment |
| `timestamp` | `VARCHAR(255)` | ISO 8601 UTC timestamp |

---

## 🛠️ Project Setup & Installation

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **MySQL Server** (v8.0 or higher)

### Installation Steps

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Kirester/kontributrack.git
   cd kontributrack
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment Variables:**
   Copy `.env.example` to `.env` and fill in your MySQL database credentials and iProgSMS API token:
   ```bash
   cp .env.example .env
   ```

4. **Start the Development Server:**
   ```bash
   npm run dev
   ```

5. **Access Application:**
   - **Officer Dashboard:** `http://localhost:3000/login.html`
   - **Default Officer Credentials:** `admin` / `admin123` *(Change before production demo)*
   - **Member Self-Check:** `http://localhost:3000/check-status.html`

---

## 🚧 Unfinished & Future Roadmap (MVP Phase 2)

The following planned capabilities are documented for future iterations:

- [ ] **Automated Month-End Reminders:** Background cron job service to query unpaid members at month-end and trigger batch reminder SMS via iProgSMS Reminder API.
- [ ] **PostgreSQL Migration Adapter:** Pluggable database driver configuration for seamless migration from local MySQL to cloud-hosted PostgreSQL (Supabase / Render / Railway).
- [ ] **Multi-Gateway SMS Failover:** Modular SMS service interface supporting fallback providers (e.g. Semaphore PH, Twilio) if the primary gateway is unavailable.
- [ ] **Role-Based Access Control (RBAC):** Multi-tier permissions (Super Admin, Senior Treasurer, Assistant Officer).
- [ ] **PDF Financial Export:** Generate downloadable monthly income & dues collection summary reports for HOA board meetings.

---

## 📄 License

Developed for Capstone Demonstration & Educational Purposes.
