# Clinic Management API – Postman Testing Guide

This guide summarizes the REST endpoints exposed by the Clinic Management System and provides sample payloads so you can exercise the API easily in Postman. All routes are mounted under the `/api` prefix.

## Getting Started

- **Base URL:** `http://localhost:3000/api`
- **Auth:** Use `POST /auth/login` to obtain a JWT. Add it to all protected requests as `Authorization: Bearer <token>`.
- **Environment Variables:** Consider creating a Postman environment with variables such as:
  - `baseUrl` → `http://localhost:3000/api`
  - `token` → *(updated after login)*
  - `patientId`, `doctorId`, `appointmentId`, etc. → set from responses to chain requests.
- **Headers:** For JSON requests, set `Content-Type: application/json`. Include `Authorization` once authenticated.
- **Prerequisites:** PostgreSQL and Redis must be running; the Prisma schema must be migrated, and the server started (`npm run dev`).

---

## Authentication

### `POST {{baseUrl}}/auth/register`
Registers a new employee (admin-only action in production flows).
```json
{
  "fullName": "Jane Doe",
  "email": "jane.doe@example.com",
  "password": "Secret123",
  "role": "ADMIN",
  "department": "Management",
  "phone": "+254700000000"
}
```

### `POST {{baseUrl}}/auth/login`
Obtain JWT token for subsequent requests.
```json
{
  "email": "jane.doe@example.com",
  "password": "Secret123"
}
```

### `POST {{baseUrl}}/auth/logout`
Invalidates current session (audit log entry). Requires `Authorization` header.

---

## Patients

### `POST {{baseUrl}}/patients`
Create patient (roles: `RECEPTIONIST`, `ADMIN`).
```json
{
  "fullName": "John Kamau",
  "gender": "Male",
  "dateOfBirth": "1990-05-15",
  "phone": "+254712345678",
  "email": "john.kamau@example.com",
  "idNumber": "12345678",
  "address": "Nairobi",
  "emergencyContact": {
    "name": "Mary Kamau",
    "phone": "+254701234567"
  },
  "medicalHistory": "Allergic to penicillin"
}
```

### `GET {{baseUrl}}/patients`
List patients with pagination query params `page`, `pageSize`. Roles: `RECEPTIONIST`, `DOCTOR`, `PHARMACIST`, `ACCOUNTANT`, `ADMIN`.

### `GET {{baseUrl}}/patients/{{patientId}}`
Fetch patient details; logs a `VIEW` audit event.

### `PUT {{baseUrl}}/patients/{{patientId}}`
Update patient fields (roles: `RECEPTIONIST`, `ADMIN`).

### `GET {{baseUrl}}/patients/search?q=...`
Search by name/phone/email.

---

## Appointments

### `POST {{baseUrl}}/appointments`
Create appointment (roles: `RECEPTIONIST`, `ADMIN`).
```json
{
  "patientId": "{{patientId}}",
  "doctorId": "{{doctorId}}",
  "department": "General Medicine",
  "date": "2025-01-20",
  "time": "10:30",
  "notes": "Follow-up visit"
}
```
Triggers doctor notification and schedules patient SMS reminder (24h before).

### `GET {{baseUrl}}/appointments`
Optional filters: `status`, `patientId`, `doctorId`, `date`, plus pagination. Roles: `RECEPTIONIST`, `DOCTOR`, `ACCOUNTANT`, `ADMIN`.

### `GET {{baseUrl}}/appointments/{{appointmentId}}`
Detailed view (includes billing/prescriptions).

### `PUT {{baseUrl}}/appointments/{{appointmentId}}`
Update appointment details (roles: `RECEPTIONIST`, `ADMIN`) with double-booking prevention.

### `PATCH {{baseUrl}}/appointments/{{appointmentId}}/status`
Update status (`SCHEDULED`, `CHECKED_IN`, `COMPLETED`, `CANCELLED`).
```json
{
  "status": "COMPLETED",
  "notes": "Patient seen, prescription issued"
}
```
On completion: auto-creates draft billing, notifies accountants. On cancellation: sends SMS to patient and in-app alert to doctor.

### `DELETE {{baseUrl}}/appointments/{{appointmentId}}`
Cancels appointment (roles: `RECEPTIONIST`, `ADMIN`); emits cancellation notifications.

---

## Billing & Payments (roles: `ACCOUNTANT`, `ADMIN`)

### `POST {{baseUrl}}/billing`
```json
{
  "patientId": "{{patientId}}",
  "appointmentId": "{{appointmentId}}",
  "paymentMode": "CASH",
  "totalAmount": 3500,
  "paidAmount": 0
}
```

### `GET {{baseUrl}}/billing`
Filters: `status`, `patientId`, `appointmentId`, pagination.

### `GET {{baseUrl}}/billing/{{billingId}}`
Returns payments array; writes `VIEW` audit entry.

### `POST {{baseUrl}}/billing/{{billingId}}/payment`
Records payment, updates balances, sends confirmations.
```json
{
  "amount": 2000,
  "method": "MPESA",
  "reference": "MPESA12345"
}
```

### `GET {{baseUrl}}/billing/outstanding`
Lists all bills with outstanding balances.

---

## Prescriptions & Dispensing

### `POST {{baseUrl}}/prescriptions`
(roles: `DOCTOR`, `ADMIN`)
```json
{
  "patientId": "{{patientId}}",
  "doctorId": "{{doctorId}}",
  "appointmentId": "{{appointmentId}}",
  "notes": "Take after meals",
  "items": [
    {
      "itemId": "{{itemId}}",
      "quantity": 2,
      "dosage": "1 tablet",
      "frequency": "Twice daily",
      "duration": "5 days",
      "instructions": "After meals"
    }
  ]
}
```
Notifies pharmacists and patient.

### `GET {{baseUrl}}/prescriptions`
Filters: `patientId`, `doctorId`, `dispensed`, pagination.

### `GET {{baseUrl}}/prescriptions/{{prescriptionId}}`
Returns items with linked medication data.

### `POST {{baseUrl}}/prescriptions/{{prescriptionId}}/dispense`
(roles: `PHARMACIST`, `ADMIN`) Deducts stock, records `StockTransaction`, marks prescription as dispensed. Fails with 400 if insufficient stock.

---

## Inventory

- `POST {{baseUrl}}/items` *(roles: `PHARMACIST`, `ADMIN`)*
- `GET {{baseUrl}}/items` (filters `category`, `name`)
- `GET {{baseUrl}}/items/low-stock`
- `POST {{baseUrl}}/items/{{itemId}}/stock` adjust inventory
  ```json
  { "type": "IN", "quantity": 50, "reference": "PurchaseOrder#123" }
  ```
- `GET {{baseUrl}}/items/expiring?days=30`

Low stock events trigger in-app and email notifications to pharmacists/admins.

---

## Lab Orders

- `POST {{baseUrl}}/lab-orders` *(roles: `DOCTOR`, `ADMIN`)*
  ```json
  {
    "patientId": "{{patientId}}",
    "orderedBy": "{{doctorId}}",
    "testType": "Full Blood Count",
    "notes": "Check hemoglobin levels"
  }
  ```
  Notifies patient (SMS) and ordering doctor.
- `GET {{baseUrl}}/lab-orders` (filters `patientId`, `orderedBy`, `status`)
- `GET {{baseUrl}}/lab-orders/{{labOrderId}}`
- `PUT {{baseUrl}}/lab-orders/{{labOrderId}}/result`
  ```json
  { "result": "Hemoglobin: 12.5 g/dL" }
  ```
  Sends notifications to doctor and patient.

---

## Notifications

All endpoints require authentication.

- `GET {{baseUrl}}/notifications` – optional `page`, `pageSize`.
- `GET {{baseUrl}}/notifications/unread` – returns `{ "data": { "unread": <count> } }`.
- `PATCH {{baseUrl}}/notifications/read-all` – marks pending/sent notifications as read.
- `PATCH {{baseUrl}}/notifications/{{notificationId}}/read` – marks single notification as read.
- `DELETE {{baseUrl}}/notifications/{{notificationId}}` – deletes notification for current user.

---

## Audit Logs (admin access)

- `GET {{baseUrl}}/audit-logs` – filters by `userId`, `entityType`, `action`, date range, pagination.
- `GET {{baseUrl}}/audit-logs/{{auditLogId}}`
- `GET {{baseUrl}}/audit-logs/entity/{{entityType}}/{{entityId}}`
- `GET {{baseUrl}}/audit-logs/user/{{userId}}`
- `GET {{baseUrl}}/audit-logs/my-activity` – available to any authenticated user; optional date filters.

---

## Testing Tips

1. **Sequence:** Start with admin registration → login → seed doctor/pharmacist/accountant → create patients → schedule appointments → verify notifications & audit logs.
2. **Collections:** Group endpoints by module in Postman for clarity. Use scripts to set environment variables from responses:
   ```js
   pm.environment.set('patientId', pm.response.json().data.id);
   ```
3. **WebSockets:** Use Socket.io client (e.g., Postman’s new VSCode extension or a small Node script) with the JWT to observe real-time notifications.
4. **Queues:** Monitor Redis (`redis-cli monitor`) to ensure Bull jobs execute when scheduling reminders or sending SMS/email.
5. **Error Cases:** Verify validation errors (e.g., missing required fields), role-based 403 responses, over-payment protection, and insufficient stock handling.

With these endpoints and payloads imported into Postman, you can script comprehensive regression scenarios covering the clinic’s core workflows. Happy testing!
