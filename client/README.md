# ClinicMate Dashboard (React)

Modern health operations dashboard built with Vite + React. The layout is inspired by the HealthMate concept on Behance and pairs with the Clinic Management API.

## Getting Started

```bash
cd client
npm install
npm run dev
```

The development server runs at `http://localhost:5173`. Configure the backend base URL by adding a `.env` file with:

```
VITE_API_URL=http://localhost:3000/api
```

Sign in with an existing clinic employee account (email + password) to authorize API requests; the dashboard pulls live patient, appointment, and billing metrics after authentication and gracefully falls back to mock data only when the backend is unreachable.

Default seeded credentials (run `npm run seed` in the backend project first):

- Admin: `admin@clinicmate.ke` / `Clinic123!`
- Doctor: `doctor@clinicmate.ke` / `Clinic123!`
- Pharmacist: `pharmacist@clinicmate.ke` / `Clinic123!`

## Available Scripts

- `npm run dev` – start the development server with instant reload
- `npm run build` – generate a production build
- `npm run preview` – preview the production build locally

## Project Structure

```
src/
├── components/         # Reusable layout + dashboard widgets
├── data/               # Local mock data used for initial render
├── services/           # API helper and auth-aware fetch utilities
├── App.jsx             # Root layout composition
└── App.css             # Design system styles inspired by HealthMate
```

The UI displays mock data on first paint, then refreshes in-place with real metrics once authentication succeeds. Authenticated routes include dashboard analytics, patient registry, appointments, billing, prescriptions, lab orders, inventory, notifications, and admin audit logs.

Role capabilities:
- Admin – full control + audit logs
- Receptionist – patients & appointments
- Doctor – appointments, prescriptions, lab orders
- Pharmacist – prescriptions dispensing & stock
- Accountant – billing & payments

## Design Notes

- Typography: Inter + Poppins (Google Fonts)
- Iconography: [react-icons](https://react-icons.github.io/react-icons/) Feather set
- Layout: responsive two-column shell with sticky sidebar and glassmorphism cards
- Charts: SVG sparkline with gradient fill, responsive cards, and status pills to mirror the reference design aesthetics.
