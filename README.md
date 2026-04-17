# Salon KPI - Long-term Structure

This project is split for long-term operation:

- `backend`: Node.js + Express + SQLite API
- `frontend`: React (Vite) admin app

## Local development

Run in 2 terminals:

### Backend

```bash
cd backend
npm install
npm run dev
```

Backend default: `http://localhost:4000`

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend default: `http://localhost:5173`

## Key API endpoints

- `GET /api/staff`
- `POST /api/staff`
- `GET /api/branches`
- `POST /api/branches`
- `PUT /api/attendance`
- `GET /api/kpi-config`
- `PUT /api/kpi-config`
- `POST /api/salary-adjustments`
- `PUT /api/salary-adjustments/bulk`
- `GET /api/reports/kpi?month=YYYY-MM`
- `GET /api/reports/salary?month=YYYY-MM`
