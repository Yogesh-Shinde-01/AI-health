# AI Health Assistant — Backend API

Express + Prisma + PostgreSQL (Supabase). **No MongoDB.**

## Setup

```bash
cd backend
cp .env.example .env
# Set DATABASE_URL (Supabase) and JWT_SECRET
npm install
npm run db:generate
npm run db:push
npm run dev
```

Default: `http://localhost:5000/api`

Frontend `.env`:

```
VITE_API_URL=http://localhost:5000/api
```

## Auth (`/api/auth`)

| Method | Path | Body |
|--------|------|------|
| POST | `/register/patient` | fullName, phone, email, password |
| POST | `/register/doctor` | fullName, phone, email, password, specialization, licenseNumber, … |
| POST | `/verify-otp` | phone, otp, role |
| POST | `/login` | email, password, role |
| POST | `/verify-login-otp` | phone, otp, role → `{ token, user, role }` |
| POST | `/resend-otp` | phone |
| POST | `/forgot-password` | email, role |
| POST | `/reset-password` | phone, otp, newPassword |

Legacy (existing React app): `/send-otp`, `/login/verify`, etc. Login step 1 uses `POST /login`.

## Patient (`/api/patient`) — auth + role patient

`GET/PUT /profile`, `PUT /update-profile`, `POST /upload-picture`, `GET /consultations`, `GET /prescriptions`, `GET/PUT /medical-history`

## Doctor (`/api/doctor`) — auth + role doctor

`GET/PUT /profile`, `PUT /update-profile`, `POST /upload-picture`, `PUT /availability`, `GET /patients`, `GET /consultations`

## Public

`GET /api/doctors?specialization=Orthopedic`

## Consultation (`/api/consultation`)

`POST /submit`, `GET /:id`, `PUT /:id/status`, `GET /patient/:patientId`, `GET /doctor/:doctorId`

## Prescription (`/api/prescription`)

`POST /create`, `PUT /:id/approve`, `GET /:id`, `GET /patient/:patientId`, `GET /consultation/:consultationId`

## Rules enforced

- bcrypt salt **10**, passwords never returned
- JWT **7d**, payload `{ id, role }`
- OTP **6 digits**, **10 min**, single use
- `isVerified: true` required for login
- `roleMiddleware` on protected routes
- CORS: `FRONTEND_URL`

## OTP in dev

Console: `[OTP] SMS → +91…: 123456` when `DEV_LOG_OTP=true`
