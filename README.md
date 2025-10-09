# Clinic Management System API

Node.js / Express based backend for managing patients, appointments, billing, prescriptions, laboratory workflows, inventory, real-time notifications, and audit trails for clinics in Kenya.

## Features

- Patient registry with search and CRUD operations
- Appointment scheduling with double-booking prevention, reminders, and status workflows
- Billing lifecycle with payments, Mpesa/NHIF support, and outstanding balance tracking
- Prescription creation and dispensing with inventory deductions and low-stock alerts
- Laboratory orders with result notifications to doctors and patients
- Centralized notification system (Socket.io, SMS via Africa's Talking, email via Nodemailer)
- Full audit logging for authentication, data mutations, and sensitive read operations
- Queue-backed background jobs using Bull + Redis

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Database:** PostgreSQL with Prisma ORM
- **Auth:** JWT + bcrypt
- **Validation:** express-validator
- **Real-time:** Socket.io
- **Queues:** Bull + Redis
- **Messaging:** Africa's Talking (SMS), Nodemailer (email)

## Prerequisites

- Node.js ≥ 18
- PostgreSQL (running and reachable via `DATABASE_URL`)
- Redis (for Bull queues)
- Africa's Talking sandbox credentials and SMTP credentials (if you want to test SMS/email)

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```
2. **Configure environment**
   Copy `.env.example` (if present) or create `.env` with the variables documented below.
3. **Database setup**
   ```bash
   npx prisma migrate dev --name init
   npx prisma generate
   npm run seed
   ```
4. **Run development server**
   ```bash
   npm run dev
   ```
   The API listens on `http://localhost:3000`. WebSocket server is mounted on the same port.

## Environment Variables

```
DATABASE_URL=postgresql://user:password@localhost:5432/clinic_db
REDIS_URL=redis://localhost:6379
JWT_SECRET=super-secret
JWT_EXPIRES_IN=7d
PORT=3000
NODE_ENV=development

# Africa's Talking
AT_USERNAME=sandbox
AT_API_KEY=your-api-key
AT_SENDER_ID=CLINIC

# Email
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

CLIENT_URL=http://localhost:5173
```

## Scripts

- `npm run dev` – start the server with Nodemon
- `npm start` – start the server with Node
- `npm test` – run the Jest suite (mocked dependencies; no DB needed)

## Frontend (React Dashboard)

A companion dashboard inspired by the HealthMate design is located in the `client/` directory and is built with Vite + React.

```bash
cd client
npm install           # already executed when scaffolding
npm run dev           # start development server on http://localhost:5173
npm run build         # generate production bundle
```

Set `VITE_API_URL` in `client/.env` to point at the running API (defaults to `http://localhost:3000/api`). Sign in with the seeded admin account (`admin@clinicmate.ke` / `Clinic123!`) or any other employee credential; the UI hydrates live metrics (patients, appointments, billing, prescriptions, lab orders, inventory, notifications, audit logs) and falls back to demo data only if the API is unreachable.

Role-based navigation and CRUD:
- **Admin** – full access across all modules, audit trail visibility, inventory/billing management.
- **Receptionist** – patient registry and appointment scheduling/status updates.
- **Doctor** – patient viewing, appointments, prescriptions (create), lab orders (create/result entry).
- **Pharmacist** – prescriptions dispensing and inventory management.
- **Accountant** – billing dashboard and payment recording.

## Testing

Endpoint coverage is provided by Jest. Tests live under `tests/` and use a mocked Prisma client plus in-memory request injection. See `docs/testing.md` for a detailed guide on the test harness and for instructions on writing additional tests.

## Background Jobs & Notifications

- Bull queue workers are configured in `src/queues/notification.queue.js`.
- Queue processing is skipped automatically during tests (`NODE_ENV=test`).
- Real-time notifications are emitted via Socket.io from `src/sockets/notification.socket.js`.
- SMS and email delivery is coordinated by `src/services/notification.service.js`.

## Documentation

- API walkthrough: `docs/api.md`
- Test documentation: `docs/testing.md`
- Frontend design notes: `client/README.md`

## Continuous Integration

GitHub Actions workflow (`.github/workflows/ci.yml`) installs dependencies with `npm ci` and runs the test suite on pushes and pull requests targeting `main`.

## Contributing

1. Fork and clone the repository
2. Create a feature branch (`git checkout -b feature/my-change`)
3. Make your changes and add corresponding tests/documentation
4. Run `npm test`
5. Submit a pull request describing the changes and expected behavior
