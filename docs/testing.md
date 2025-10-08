# Testing Guide

This project ships with an automated test suite that exercises every REST endpoint exposed by the Clinic Management API. The suite runs with Jest and does **not** require external services (PostgreSQL, Redis, Africa's Talking, SMTP) because those integrations are mocked.

## Tooling

- **Test Runner:** Jest (configured in `jest.config.js`)
- **HTTP Simulation:** [`light-my-request`](https://github.com/fastify/light-my-request) to inject requests directly into the Express app without binding a TCP port
- **Mocks & Fixtures:**
  - Prisma client (`tests/prismaMock.js`) – provides stubbed models and shared `$transaction`
  - Audit, notification, and inventory services – mocked in `tests/jest.setup.js`
  - Notification queue and WebSocket layer – mocked so no background workers run

## Layout

```
tests/
├── helpers/request.js         # thin wrapper around light-my-request
├── jest.setup.js              # global mocks and env defaults
├── prismaMock.js              # reusable Prisma stub
├── *.routes.test.js           # one file per route group (auth, patients, etc.)
└── health.test.js             # basic health check coverage
```

Each `*.routes.test.js` file validates:
- happy-path responses and status codes
- pagination metadata where applicable
- expected side effects such as audit logging or notification calls (asserted through mocks)

## Running Tests Locally

```bash
npm install
npm test
```

The `npm test` script sets `NODE_ENV=test` and runs Jest in-band so output is deterministic. No database migrations are required for the suite.

## Adding New Tests

1. Import the Express app via `const app = require('../src/app')`.
2. Use the helper to issue requests:
   ```javascript
   const { request } = require('./helpers/request');

   const response = await request(app, {
     method: 'POST',
     url: '/api/example',
     headers: { Authorization: token },
     body: { /* payload */ }
   });
   ```
3. Stub any data access by configuring the Prisma mock before issuing the request.
4. Assert on the HTTP status, JSON body, and relevant mocked side effects.

## Continuous Integration

GitHub Actions (see `.github/workflows/ci.yml`) runs `npm ci` followed by `npm test` on every push and pull request to the `main` branch, ensuring the suite remains green before changes are merged.
