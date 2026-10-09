# WhistleDrop API

A secure, anonymous whistleblowing backend API built with Node.js, Express, MongoDB, and JSON Web Tokens (JWT).

WhistleDrop allows anonymous users to submit confidential incident reports, receive a cryptographic case tracking code, and check their report status. Authenticated moderators can review, filter, paginate, and transition report statuses through a protected administrative API.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites & Installation](#prerequisites--installation)
- [Environment Variables](#environment-variables)
- [Moderator Account Setup](#moderator-account-setup)
- [Running the Server](#running-the-server)
- [Running Tests](#running-tests)
- [Interactive API Documentation (Swagger)](#interactive-api-documentation-swagger)
- [API Reference & Examples](#api-reference--examples)
  - [1. Health Check](#1-health-check)
  - [2. Public Anonymous Report Submission](#2-public-anonymous-report-submission)
  - [3. Public Report Tracking](#3-public-report-tracking)
  - [4. Moderator Login](#4-moderator-login)
  - [5. Authenticated Moderator Profile](#5-authenticated-moderator-profile)
  - [6. Moderator Report Listing (Pagination & Filters)](#6-moderator-report-listing-pagination--filters)
  - [7. Moderator Report Status Update](#7-moderator-report-status-update)
- [Security Hardening](#security-hardening)
- [Project Structure](#project-structure)

---

## Features

- **Anonymous Reporting**: Public report submission generates a unique, unguessable case code (`WD-` followed by 16 hexadecimal characters).
- **Report Tracking**: Whistleblowers can check their case status at any time without creating an account or revealing their identity.
- **Moderator Authentication**: JWT-based authentication for administrative endpoints with bcrypt-hashed passwords.
- **Report Management**: Paginated listing (`page`, `limit`), sorting (newest first), and filtering by `status` and `category`.
- **Status Lifecycle**: Managed workflow transitions (`SUBMITTED` -> `UNDER_REVIEW` -> `RESOLVED` / `DISMISSED`).
- **Security Hardening**:
  - Fail-fast startup validation (exits immediately if `JWT_SECRET` is missing).
  - Zero hardcoded fallback secrets in source code.
  - Helmet HTTP security headers (CSP, HSTS, X-Frame-Options, X-Content-Type-Options).
  - Restricted CORS (cross-origin browser calls blocked by default unless whitelisted via `ALLOWED_ORIGINS`).
- **Interactive OpenAPI / Swagger Documentation**: Available at `/api-docs`.

---

## Tech Stack

- **Runtime**: Node.js (v18+)
- **Framework**: Express.js 5
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (`jsonwebtoken`) & `bcryptjs`
- **Security**: `helmet`, `cors`, `crypto`
- **API Documentation**: `swagger-jsdoc` & `swagger-ui-express` (OpenAPI 3.0)
- **Testing**: Node.js Built-in Test Runner (`node:test`, `node:assert/strict`)

---

## Prerequisites & Installation

### Prerequisites
- Node.js (v18.0.0 or higher)
- A running MongoDB instance or MongoDB Atlas cluster URI

### Installation

1. Clone or download the repository:
   ```bash
   git clone <repository-url>
   cd WhistleDrop
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

---

## Environment Variables

Create a `.env` file in the project root with the following configuration:

```env
# MongoDB Connection String (Atlas or Local)
MONGO_URI=mongodb://username:password@cluster.mongodb.net/?ssl=true&authSource=admin

# Server Port (Default: 5000)
PORT=5000

# Cryptographically Secure JWT Secret Key (Required)
JWT_SECRET=your_super_secret_jwt_key_here_minimum_32_characters

# JWT Expiration Duration (Default: 24h)
JWT_EXPIRES_IN=24h

# Optional: Comma-separated list of allowed CORS origins (leave unset to block browser cross-origin calls)
# ALLOWED_ORIGINS=https://admin.yourdomain.com
```

### Environment Variables Description

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `MONGO_URI` | **Yes** | — | Connection string for MongoDB database. |
| `PORT` | No | `5000` | Port for the HTTP server. |
| `JWT_SECRET` | **Yes** | — | Cryptographic secret used to sign and verify JWT tokens. **Server will refuse to start if missing.** |
| `JWT_EXPIRES_IN`| No | `24h` | Token expiration lifespan (e.g. `24h`, `7d`). |
| `ALLOWED_ORIGINS`| No | `false` | Comma-separated whitelist of allowed browser origins for CORS. |

> [!IMPORTANT]
> Never commit `.env` to Git. Keep `.env` listed in `.gitignore` and inject secrets securely through environment variables in production.

---

## Moderator Account Setup

To seed an initial moderator account in MongoDB:

```bash
node src/scripts/createModerator.js
```

This creates the default moderator:
- **Username**: `admin`
- **Password**: `Whistle@Amritesh#2026!`

*(You can modify credentials in `src/scripts/createModerator.js` before running the script).*

---

## Running the Server

### Development / Production
```bash
node src/server.js
```
or
```bash
npm start
```

When started, the API will be available at:
`http://localhost:5000`

---

## Running Tests

WhistleDrop uses Node.js's native test runner (`node:test`). Tests run in-memory without requiring a live MongoDB connection:

```bash
node --test tests/**/*.test.js
```

### Test Suites Included
- `tests/auth.test.js`: Token validation, login route, `/api/auth/me`, route protection, public routes.
- `tests/report.test.js`: Report listing authentication, pagination logic, status/category filtering, PATCH status protection.
- `tests/swagger.test.js`: OpenAPI 3.0 specification verification, Swagger UI HTML route, redirect routes.

---

## Interactive API Documentation (Swagger)

WhistleDrop includes built-in OpenAPI 3.0 interactive documentation:

- **Swagger UI**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs) (also redirects from `/docs` and `/api/docs`)
- **OpenAPI JSON Spec**: [http://localhost:5000/api-docs.json](http://localhost:5000/api-docs.json)

---

## API Reference & Examples

### 1. Health Check

#### `GET /`
Returns the API operational status.

**Example Request:**
```bash
curl -X GET http://localhost:5000/
```

**Example Response (`200 OK`):**
```json
{
  "message": "WhistleDrop API is running"
}
```

---

### 2. Public Anonymous Report Submission

#### `POST /api/reports`
Submits an anonymous report. Does not require authentication.

**Request Body:**
```json
{
  "category": "Financial Misconduct",
  "description": "Unaccounted expenditure found in project budget invoices.",
  "evidenceUrl": "https://example.com/evidence/invoice.pdf"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:5000/api/reports \
  -H "Content-Type: application/json" \
  -d '{
    "category": "Financial Misconduct",
    "description": "Unaccounted expenditure found in project budget invoices.",
    "evidenceUrl": "https://example.com/evidence/invoice.pdf"
  }'
```

**Example Response (`201 Created`):**
```json
{
  "message": "Report submitted successfully",
  "caseCode": "WD-7A8B9C0D1E2F3456"
}
```

---

### 3. Public Report Tracking

#### `GET /api/reports/:caseCode`
Allows the whistleblower to check case status using their private case code.

**Example Request:**
```bash
curl -X GET http://localhost:5000/api/reports/WD-7A8B9C0D1E2F3456
```

**Example Response (`200 OK`):**
```json
{
  "caseCode": "WD-7A8B9C0D1E2F3456",
  "category": "Financial Misconduct",
  "description": "Unaccounted expenditure found in project budget invoices.",
  "status": "SUBMITTED",
  "createdAt": "2026-10-09T14:30:00.000Z"
}
```

---

### 4. Moderator Login

#### `POST /api/auth/login`
Authenticates moderator credentials and issues a JWT Bearer token.

**Request Body:**
```json
{
  "username": "admin",
  "password": "Whistle@Amritesh#2026!"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "Whistle@Amritesh#2026!"
  }'
```

**Example Response (`200 OK`):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3MDZlMTJhODg5MzExMmE5MTJjNzcwMCIsInVzZXJuYW1lIjoiYWRtaW4iLCJpYXQiOjE3NjAwOTQ0MDAsImV4cCI6MTc2MDE4MDgwMH0...",
  "moderator": {
    "id": "6706e12a8893112a912c7700",
    "username": "admin"
  }
}
```

---

### 5. Authenticated Moderator Profile

#### `GET /api/auth/me`
Returns details of the currently authenticated moderator.

**Headers:**
`Authorization: Bearer <TOKEN>`

**Example Request:**
```bash
curl -X GET http://localhost:5000/api/auth/me \
  -H "Authorization: Bearer <TOKEN>"
```

**Example Response (`200 OK`):**
```json
{
  "moderator": {
    "id": "6706e12a8893112a912c7700",
    "username": "admin",
    "createdAt": "2026-10-09T14:00:00.000Z"
  }
}
```

---

### 6. Moderator Report Listing (Pagination & Filters)

#### `GET /api/reports`
Lists reports with support for pagination and filtering. Protected by moderator authentication.

**Headers:**
`Authorization: Bearer <TOKEN>`

**Query Parameters:**
- `page` *(optional, integer, default: 1)*: Current page number.
- `limit` *(optional, integer, default: 10)*: Number of reports per page.
- `status` *(optional, string)*: Filter by status (`SUBMITTED`, `UNDER_REVIEW`, `RESOLVED`, `DISMISSED`).
- `category` *(optional, string)*: Filter by category (e.g. `Fraud`, `Bribery`).

**Example Request:**
```bash
curl -X GET "http://localhost:5000/api/reports?page=1&limit=5&status=UNDER_REVIEW&category=Bribery" \
  -H "Authorization: Bearer <TOKEN>"
```

**Example Response (`200 OK`):**
```json
{
  "reports": [
    {
      "_id": "6706e23b8893112a912c7710",
      "caseCode": "WD-7A8B9C0D1E2F3456",
      "category": "Bribery",
      "description": "Report details regarding bribery.",
      "evidenceUrl": "https://example.com/doc.pdf",
      "status": "UNDER_REVIEW",
      "createdAt": "2026-10-09T14:30:00.000Z",
      "updatedAt": "2026-10-09T14:45:00.000Z"
    }
  ],
  "total": 1,
  "page": 1,
  "limit": 5,
  "totalPages": 1,
  "pagination": {
    "page": 1,
    "limit": 5,
    "total": 1,
    "totalPages": 1
  }
}
```

---

### 7. Moderator Report Status Update

#### `PATCH /api/reports/:caseCode/status`
Updates the status of an existing report. Protected by moderator authentication.

**Headers:**
`Authorization: Bearer <TOKEN>`

**Request Body:**
```json
{
  "status": "RESOLVED"
}
```

*Allowed statuses:* `SUBMITTED`, `UNDER_REVIEW`, `RESOLVED`, `DISMISSED`.

**Example Request:**
```bash
curl -X PATCH http://localhost:5000/api/reports/WD-7A8B9C0D1E2F3456/status \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"status": "RESOLVED"}'
```

**Example Response (`200 OK`):**
```json
{
  "message": "Report status updated successfully",
  "caseCode": "WD-7A8B9C0D1E2F3456",
  "status": "RESOLVED"
}
```

---

## Security Hardening

WhistleDrop enforces multiple security layers:

1. **Fail-Fast Startup**: If `JWT_SECRET` is not set, the process terminates immediately (`process.exit(1)`) before binding ports or connecting to the database.
2. **No Fallback Secrets**: Zero hardcoded default strings in authentication logic.
3. **Helmet HTTP Headers**: Configured with Content Security Policy compatible with Swagger UI.
4. **Backend-Only CORS**: Browser cross-origin requests are blocked by default unless explicitly configured via `ALLOWED_ORIGINS`.
5. **High-Entropy Case Codes**: Uses `crypto.randomBytes(8)` to create cryptographically secure 16-character hexadecimal codes prefixed with `WD-`.

---

## Project Structure

```text
WhistleDrop/
├── src/
│   ├── config/
│   │   ├── db.js                 # MongoDB connection logic
│   │   └── swagger.js            # OpenAPI 3.0 / Swagger specification
│   ├── middleware/
│   │   └── auth.js               # JWT verification middleware (verifyToken)
│   ├── models/
│   │   ├── Moderator.js          # Moderator Mongoose model
│   │   └── Report.js             # Incident report Mongoose model
│   ├── routes/
│   │   └── authRoutes.js         # /api/auth routes (login, me)
│   ├── scripts/
│   │   └── createModerator.js    # Moderator seed script
│   └── server.js                 # Express server & API endpoints
├── tests/
│   ├── auth.test.js              # Phase 1 Auth tests
│   ├── report.test.js            # Phase 2 Report management tests
│   └── swagger.test.js           # Swagger / OpenAPI documentation tests
├── .env                          # Local environment variables (not committed)
├── package.json                  # Dependencies and scripts
└── README.md                     # Project documentation
```
