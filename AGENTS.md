# Clinic Management System - Node.js Instructions for AI Agent

## 🎯 Project Overview
Build a Node.js REST API for managing small clinics in Kenya. Handle patients, appointments, billing, prescriptions, pharmacy inventory, **real-time notifications**, and **audit logging**.

---

## 📋 Tech Stack
- **Runtime:** Node.js v18+
- **Framework:** Express.js
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Auth:** JWT + bcrypt
- **Validation:** express-validator
- **WebSockets:** Socket.io (real-time notifications)
- **Task Queue:** Bull + Redis (for scheduled notifications)
- **SMS/Email:** Africa's Talking API and google smtp

---

## 🔧 Setup Instructions

### Step 1: Initialize Project
```bash
mkdir clinic-app && cd clinic-app
npm init -y
npm install express prisma @prisma/client bcrypt jsonwebtoken dotenv cors express-validator
npm install socket.io bull redis africastalking nodemailer
npm install --save-dev nodemon typescript @types/node @types/express
npx prisma init
```

### Step 2: Create Directory Structure
```
clinic-app/
├── src/
│   ├── controllers/
│   ├── routes/
│   ├── middleware/
│   ├── services/
│   │   ├── notification.service.js
│   │   ├── audit.service.js
│   │   └── sms.service.js
│   ├── queues/
│   │   └── notification.queue.js
│   ├── sockets/
│   │   └── notification.socket.js
│   ├── utils/
│   └── server.js
├── prisma/
│   └── schema.prisma
├── .env
└── package.json
```

---

## 📊 Database Schema

Create `prisma/schema.prisma` with these models:

### Core Models:
1. **Patient** - fullName, gender, dateOfBirth, phone, email, idNumber, nhifNumber, address, emergencyContact, medicalHistory
2. **Employee** - fullName, role (RECEPTIONIST/DOCTOR/PHARMACIST/ACCOUNTANT/ADMIN), department, phone, email, password
3. **Appointment** - patientId, doctorId, department, date, time, status (SCHEDULED/CHECKED_IN/COMPLETED/CANCELLED), notes
4. **Billing** - patientId, appointmentId, paymentMode (CASH/INSURANCE/NHIF/MPESA), totalAmount, paidAmount, outstandingBalance, status (DRAFT/PAID/PARTIALLY_PAID)
5. **Prescription** - patientId, appointmentId, doctorId, notes
6. **PrescriptionItem** - prescriptionId, itemId, dosage, frequency, duration, instructions
7. **LabOrder** - patientId, orderedBy, testType, result, status (PENDING/COMPLETED)
8. **Item** - name, category, unit, batchNumber, expiryDate, stock, reorderLevel
9. **StockTransaction** - itemId, type (IN/OUT), quantity, balance, reference
10. **Notification**
    - id (UUID)
    - recipientId (String - Employee ID)
    - recipientType (Enum: EMPLOYEE, PATIENT)
    - type (Enum: APPOINTMENT_REMINDER, LOW_STOCK, PAYMENT_CONFIRMATION, LAB_RESULT_READY, APPOINTMENT_CANCELLED)
    - title (String)
    - message (Text)
    - data (JSON - additional context)
    - channel (Enum: IN_APP, SMS, EMAIL)
    - status (Enum: PENDING, SENT, FAILED, READ)
    - sentAt (DateTime nullable)
    - readAt (DateTime nullable)
    - createdAt (DateTime)

11. **AuditLog**
    - id (UUID)
    - userId (String - Employee ID)
    - userRole (String)
    - action (Enum: CREATE, UPDATE, DELETE, VIEW, LOGIN, LOGOUT)
    - entityType (String - e.g., "Patient", "Appointment", "Billing")
    - entityId (String nullable)
    - changes (JSON - old vs new values)
    - ipAddress (String)
    - userAgent (String)
    - timestamp (DateTime)

### Relationships:
- Patient → hasMany Appointments, Prescriptions, LabOrders, Billings
- Employee → hasMany Appointments, Prescriptions, LabOrders, Notifications, AuditLogs
- Appointment → hasOne Billing, hasMany Prescriptions
- Prescription → hasMany PrescriptionItems
- Item → hasMany PrescriptionItems, StockTransactions

---

## 🎯 API Endpoints to Build

### Authentication
- `POST /api/auth/register` - Register employee (audit log)
- `POST /api/auth/login` - Login (audit log, return JWT)
- `POST /api/auth/logout` - Logout (audit log)

### Patients
- `POST /api/patients` - Create patient (audit log)
- `GET /api/patients` - List all patients
- `GET /api/patients/:id` - Get patient details (audit log VIEW)
- `PUT /api/patients/:id` - Update patient (audit log changes)
- `GET /api/patients/search?q=` - Search by name/phone

### Appointments
- `POST /api/appointments` - Create appointment (audit log, send notification)
- `GET /api/appointments` - List appointments
- `GET /api/appointments/:id` - Get appointment details
- `PUT /api/appointments/:id` - Update appointment (audit log, send notification)
- `PATCH /api/appointments/:id/status` - Update status (audit log, notification, auto-billing)
- `DELETE /api/appointments/:id` - Cancel appointment (audit log, send cancellation notification)

### Billing
- `POST /api/billing` - Create billing (audit log)
- `GET /api/billing` - List all bills
- `GET /api/billing/:id` - Get bill details
- `POST /api/billing/:id/payment` - Record payment (audit log, send payment confirmation)
- `GET /api/billing/outstanding` - Get outstanding bills

### Prescriptions
- `POST /api/prescriptions` - Create prescription (audit log, send notification)
- `GET /api/prescriptions` - List prescriptions
- `GET /api/prescriptions/:id` - Get prescription details
- `POST /api/prescriptions/:id/dispense` - Dispense medication (audit log, reduce stock, check alerts)

### Lab Orders
- `POST /api/lab-orders` - Create lab order (audit log, send notification)
- `GET /api/lab-orders` - List orders
- `PUT /api/lab-orders/:id/result` - Add test result (audit log, send notification to patient & doctor)

### Inventory
- `POST /api/items` - Add item (audit log)
- `GET /api/items` - List items
- `GET /api/items/low-stock` - Get items below reorder level
- `POST /api/items/:id/stock` - Add/remove stock (audit log, check low stock alert)
- `GET /api/items/expiring` - Get items expiring soon

### Notifications
- `GET /api/notifications` - Get user's notifications (paginated)
- `GET /api/notifications/unread` - Get unread count
- `PATCH /api/notifications/:id/read` - Mark notification as read
- `PATCH /api/notifications/read-all` - Mark all as read
- `DELETE /api/notifications/:id` - Delete notification

### Audit Logs
- `GET /api/audit-logs` - List audit logs (admin only, filterable by user, action, entity, date range)
- `GET /api/audit-logs/:id` - Get specific audit log details
- `GET /api/audit-logs/entity/:entityType/:entityId` - Get all logs for specific entity
- `GET /api/audit-logs/user/:userId` - Get all logs for specific user

---

## 🔒 Business Logic Requirements

### Appointment Creation
- Validate doctor availability (no double-booking)
- Use unique constraint on `doctorId + date + time`
- **Create audit log entry**
- **Send in-app notification to doctor**
- **Schedule SMS reminder 24 hours before appointment**

### Appointment Status Update
- When status changes to COMPLETED:
  - Auto-generate billing record
  - **Create audit log**
  - **Send notification to accountant**
- When status changes to CANCELLED:
  - **Create audit log**
  - **Send cancellation notification to patient (SMS)**
  - **Send notification to doctor**

### Billing & Payments
- When payment recorded:
  - Update amounts and status
  - **Create audit log with payment details**
  - **Send payment confirmation (SMS + in-app)**
  - If fully paid, **send receipt notification**

### Prescription Creation
- Create prescription with items
- **Create audit log**
- **Send notification to pharmacist for dispensing**
- **Send notification to patient (ready for pickup)**

### Prescription Dispensing
- Reduce stock for each item
- Create StockTransaction records
- **Create audit log**
- **Check if any item stock falls below reorderLevel**
- **If low stock detected, send alert to admin/pharmacist**

### Lab Order Results
- When result added:
  - Update lab order status to COMPLETED
  - **Create audit log**
  - **Send notification to ordering doctor**
  - **Send notification to patient (results ready)**

### Stock Management
- On stock transaction:
  - **Create audit log**
  - **Check reorder level, send low stock alert**
  - **Check expiry dates, send expiring stock alert**

---

## 🔔 Notification System

### Notification Types & Triggers:

1. **APPOINTMENT_REMINDER**
   - Sent 24 hours before appointment
   - Channel: SMS + In-app
   - Recipients: Patient

2. **APPOINTMENT_CREATED**
   - Sent immediately when appointment booked
   - Channel: In-app
   - Recipients: Doctor

3. **APPOINTMENT_CANCELLED**
   - Sent immediately on cancellation
   - Channel: SMS + In-app
   - Recipients: Patient, Doctor

4. **PAYMENT_CONFIRMATION**
   - Sent after payment recorded
   - Channel: SMS + In-app
   - Recipients: Patient

5. **LAB_RESULT_READY**
   - Sent when lab results added
   - Channel: SMS + In-app
   - Recipients: Patient, Ordering Doctor

6. **PRESCRIPTION_READY**
   - Sent after prescription created
   - Channel: SMS + In-app
   - Recipients: Patient, Pharmacist

7. **LOW_STOCK_ALERT**
   - Sent when stock <= reorderLevel
   - Channel: In-app + Email
   - Recipients: Pharmacist, Admin

8. **EXPIRING_STOCK_ALERT**
   - Sent for items expiring in 30 days
   - Channel: In-app + Email (daily digest)
   - Recipients: Pharmacist

### Notification Service Implementation:

```javascript
// src/services/notification.service.js

class NotificationService {
  // Create notification in database
  async createNotification(data)
  
  // Send in-app notification via Socket.io
  async sendInApp(notification)
  
  // Send SMS via Africa's Talking
  async sendSMS(phone, message)
  
  // Send email via Nodemailer
  async sendEmail(email, subject, body)
  
  // Queue notification for scheduled delivery
  async scheduleNotification(notification, delay)
  
  // Mark notification as read
  async markAsRead(notificationId)
  
  // Get unread count for user
  async getUnreadCount(userId)
}
```

### Queue Setup (Bull + Redis):

```javascript
// src/queues/notification.queue.js

const Queue = require('bull');
const notificationQueue = new Queue('notifications', process.env.REDIS_URL);

// Process scheduled notifications
notificationQueue.process(async (job) => {
  const { notification } = job.data;
  await NotificationService.send(notification);
});

// Schedule appointment reminders (runs daily at 9 AM)
notificationQueue.add('appointment-reminders', {}, {
  repeat: { cron: '0 9 * * *' }
});
```

---

## 📝 Audit Logging System

### What to Log:

1. **Authentication Events**
   - Login attempts (success/failure)
   - Logout
   - Password changes
   - Failed authentication attempts

2. **Data Modifications**
   - CREATE: New records (Patient, Appointment, etc.)
   - UPDATE: Changes to existing records (capture old vs new values)
   - DELETE: Record deletions (soft delete recommended)

3. **Sensitive Data Access**
   - Viewing patient records
   - Accessing billing information
   - Viewing prescription details

4. **Financial Transactions**
   - Payment recordings
   - Billing adjustments
   - Refunds

5. **Inventory Changes**
   - Stock additions/removals
   - Item updates
   - Dispensing medications

### Audit Service Implementation:

```javascript
// src/services/audit.service.js

class AuditService {
  async log({
    userId,
    userRole,
    action, // CREATE, UPDATE, DELETE, VIEW, LOGIN, LOGOUT
    entityType, // "Patient", "Appointment", etc.
    entityId,
    changes, // { old: {...}, new: {...} }
    ipAddress,
    userAgent
  }) {
    // Create audit log entry in database
    // Include timestamp automatically
  }
  
  async getAuditTrail(entityType, entityId) {
    // Get all logs for specific entity
  }
  
  async getUserActivity(userId, dateRange) {
    // Get all activity for specific user
  }
  
  async getSystemActivity(filters) {
    // Get system-wide activity with filters
  }
}
```

### Audit Middleware:

```javascript
// src/middleware/audit.middleware.js

const auditLog = (action) => {
  return async (req, res, next) => {
    // Capture original data for UPDATE operations
    if (action === 'UPDATE' && req.params.id) {
      req.originalData = await getOriginalData(req.params.id);
    }
    
    // Continue with request
    next();
    
    // Log after response (in res.on('finish'))
    res.on('finish', async () => {
      if (res.statusCode < 400) {
        await AuditService.log({
          userId: req.user.id,
          userRole: req.user.role,
          action,
          entityType: req.entityType,
          entityId: req.params.id || res.locals.createdId,
          changes: action === 'UPDATE' ? {
            old: req.originalData,
            new: req.body
          } : null,
          ipAddress: req.ip,
          userAgent: req.headers['user-agent']
        });
      }
    });
  };
};
```

---

## 🔌 Real-Time WebSocket Setup

### Socket.io Implementation:

```javascript
// src/sockets/notification.socket.js

const socketIO = require('socket.io');

function initializeSocket(server) {
  const io = socketIO(server, {
    cors: { origin: process.env.CLIENT_URL }
  });
  
  // Authenticate socket connections
  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;
    // Verify JWT and attach user to socket
    next();
  });
  
  io.on('connection', (socket) => {
    // Join user-specific room
    socket.join(`user:${socket.user.id}`);
    
    // Join role-specific rooms
    socket.join(`role:${socket.user.role}`);
    
    socket.on('disconnect', () => {
      // Handle disconnect
    });
  });
  
  return io;
}

// Emit notification to specific user
function emitToUser(io, userId, notification) {
  io.to(`user:${userId}`).emit('notification', notification);
}

// Emit to all users with specific role
function emitToRole(io, role, notification) {
  io.to(`role:${role}`).emit('notification', notification);
}
```

### Integration in Server:

```javascript
// src/server.js

const express = require('express');
const http = require('http');
const { initializeSocket } = require('./sockets/notification.socket');

const app = express();
const server = http.createServer(app);
const io = initializeSocket(server);

// Make io accessible in routes
app.set('io', io);

server.listen(3000);
```

---

## 🔐 Authorization Rules

### Role Permissions:
- **RECEPTIONIST:** Create patients, schedule appointments (read-only on others)
- **DOCTOR:** View patients, create prescriptions, view lab orders
- **PHARMACIST:** View prescriptions, manage inventory, dispense medications
- **ACCOUNTANT:** Manage billing, record payments
- **ADMIN:** Full access + view audit logs

### Audit Log Access:
- Only ADMIN can access `/api/audit-logs/*`
- Users can view their own activity logs via `/api/audit-logs/my-activity`

---

## 🚀 Environment Variables (.env)

```env
DATABASE_URL="postgresql://user:password@localhost:5432/clinic_db"
REDIS_URL="redis://localhost:6379"
JWT_SECRET="your-secret-key"
JWT_EXPIRES_IN="7d"
PORT=3000
NODE_ENV="development"

# Africa's Talking
AT_USERNAME="sandbox"
AT_API_KEY="your-api-key"
AT_SENDER_ID="CLINIC"

# Email (Nodemailer)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Client URL for CORS
CLIENT_URL="http://localhost:5173"
```

---

## ✅ Implementation Checklist

### Core Features
- [ ] Setup project and install all dependencies
- [ ] Create Prisma schema with all models (including Notification and AuditLog)
- [ ] Run `npx prisma migrate dev` to create database
- [ ] Setup Redis connection for Bull queues
- [ ] Build authentication (register, login, JWT middleware)

### CRUD Operations
- [ ] Create patient CRUD endpoints
- [ ] Create appointment endpoints with double-booking check
- [ ] Create billing endpoints with auto-generation logic
- [ ] Create prescription endpoints with inventory integration
- [ ] Create lab order endpoints
- [ ] Create inventory/item endpoints with stock tracking

### Audit Logging
- [ ] Create AuditService class
- [ ] Create audit middleware for all routes
- [ ] Log authentication events (login, logout)
- [ ] Log all CREATE operations
- [ ] Log all UPDATE operations with old vs new values
- [ ] Log all DELETE operations
- [ ] Log sensitive data access (patient records, billing)
- [ ] Create audit log API endpoints (admin only)
- [ ] Add audit trail view for specific entities

### Notification System
- [ ] Create NotificationService class
- [ ] Setup Socket.io for real-time notifications
- [ ] Integrate Africa's Talking for SMS
- [ ] Setup Nodemailer for emails
- [ ] Create notification queue with Bull
- [ ] Implement appointment reminder scheduler (24h before)
- [ ] Send notification on appointment creation (to doctor)
- [ ] Send notification on appointment cancellation (to patient & doctor)
- [ ] Send notification on payment confirmation (to patient)
- [ ] Send notification on prescription ready (to patient & pharmacist)
- [ ] Send notification on lab results ready (to patient & doctor)
- [ ] Send low stock alerts (to pharmacist & admin)
- [ ] Send expiring stock alerts (daily digest)
- [ ] Create notification API endpoints (get, mark read, delete)
- [ ] Add unread count endpoint
- [ ] Test WebSocket connections

### Security & Access Control
- [ ] Implement role-based access control
- [ ] Add input validation on all endpoints
- [ ] Add error handling middleware
- [ ] Protect audit log endpoints (admin only)
- [ ] Add rate limiting
- [ ] Sanitize user inputs

### Testing & Deployment
- [ ] Create stock alert queries
- [ ] Test all endpoints with Postman/Thunder Client
- [ ] Test WebSocket connections
- [ ] Test notification delivery (SMS, Email, In-app)
- [ ] Test audit logging on all operations
- [ ] Add seed data for testing
- [ ] Test queue processing
- [ ] Test scheduled jobs

---

## 🧪 Testing Commands

```bash
# Start development server
npm run dev

# Run Prisma Studio (database GUI)
npx prisma studio

# Create migration
npx prisma migrate dev --name init

# Generate Prisma Client
npx prisma generate

# Start Redis (required for queues)
redis-server

# Monitor Bull queues
# Use Bull Board or Arena for queue monitoring
```

---

## 📝 Key Implementation Notes

### Audit Logging Best Practices:
1. Log asynchronously (don't block request)
2. Store changes as JSON for UPDATE operations
3. Include IP address and user agent
4. Never log sensitive data (passwords, tokens)
5. Implement log retention policy (archive old logs)
6. Index by userId, entityType, entityId, timestamp for fast queries

### Notification Best Practices:
1. Use queues for all external communications (SMS, Email)
2. Implement retry logic for failed notifications
3. Store notification status (PENDING, SENT, FAILED)
4. Rate limit SMS notifications
5. Batch email notifications where possible
6. Allow users to configure notification preferences
7. Use templates for consistent messaging

### WebSocket Best Practices:
1. Authenticate all socket connections
2. Use rooms for targeted broadcasting
3. Implement reconnection logic on client
4. Handle connection failures gracefully
5. Don't send sensitive data via sockets without encryption

### Queue Management:
1. Process jobs in order (FIFO)
2. Implement job retry with exponential backoff
3. Monitor queue health and failed jobs
4. Set job TTL to prevent stale jobs
5. Use separate queues for different priorities

### Performance Considerations:
1. Index audit logs table by userId, entityType, timestamp
2. Archive old audit logs (>1 year) to separate table
3. Use pagination for audit log queries
4. Cache unread notification counts
5. Batch process scheduled notifications
6. Use Redis for Socket.io adapter in production (multi-server)

---

## 🎯 Advanced Features (Future Enhancements)

- [ ] Notification preferences per user (allow opt-out)
- [ ] Email/SMS templates with variables
- [ ] Audit log export (CSV, PDF)
- [ ] Real-time dashboard with Socket.io (active appointments, stock levels)
- [ ] Notification history and resend functionality
- [ ] Two-factor authentication (with SMS OTP)
- [ ] Webhook support for external integrations
- [ ] Audit log analytics and reports