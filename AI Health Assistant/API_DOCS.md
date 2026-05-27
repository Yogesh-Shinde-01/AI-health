# AI Health Assistant — API Documentation

## Postman Setup Guide

**Base URL:** `http://localhost:5000/api`

**Step 1** — Create a Postman Collection called **"AI Health Assistant"**

**Step 2** — Add a Collection Variable called **`token`** (empty for now)

**Step 3** — Add a Collection Variable called **`baseUrl`** = `http://localhost:5000/api`

**Step 4** — For all protected routes set **Authorization → Bearer Token → `{{token}}`**

**Step 5** — Test in this exact order:

1. Register Patient or Doctor  
2. Verify Registration OTP  
3. Login  
4. Verify Login OTP → copy `token` from response  
5. Set `token` variable in Postman collection  
6. Test all other protected routes  

Import **`postman_collection.json`** from the project root for pre-configured requests.

---

## Test Data

**Patient test account:**

| Field | Value |
|-------|-------|
| fullName | Ravi Kadam |
| phone | 9876543210 |
| email | ravi@gmail.com |
| password | Test@1234 |
| role | patient |

**Doctor test account:**

| Field | Value |
|-------|-------|
| fullName | Dr. Sameer Patil |
| phone | 9123456789 |
| email | sameer@gmail.com |
| password | Test@1234 |
| role | doctor |
| specialization | Orthopedic |
| licenseNumber | MH-123456 |
| clinicName | City Care Hospital |
| clinicAddress | Mumbai, Maharashtra |
| yearsOfExperience | 10 |
| consultationFee | 500 |

**Test OTP (DEV mode):** Check backend terminal — OTP is printed when `DEV_LOG_OTP=true`.

**Password in DB URL:** Encode `#` as `%23`, `@` as `%40` in connection strings.

---

## Standard Error Format

All API errors use:

```json
{
  "success": false,
  "message": "Human-readable message",
  "code": "OPTIONAL_CODE"
}
```

| HTTP | Typical `code` | When |
|------|----------------|------|
| 400 | `VALIDATION`, `INVALID_CREDENTIALS`, `INVALID_OTP`, `NOT_FOUND` | Bad input / auth |
| 401 | `UNAUTHORIZED` | Missing or invalid JWT |
| 403 | `FORBIDDEN`, `NOT_VERIFIED` | Role mismatch / unverified user |
| 404 | `NOT_FOUND` | Route or resource missing |
| 409 | `DUPLICATE` | Unique constraint (e.g. phone/email) |
| 500 | — | Server error |

---

## Health

### Health Check

**Method:** GET  
**URL:** `{{baseUrl}}/health`  
**Auth Required:** No  
**Frontend Service:** — (not wrapped in a service file)

**Headers:**

```
(none required)
```

**Body:** None

**Success Response (200):**

```json
{
  "success": true,
  "service": "ai-health-assistant-api"
}
```

**Error Responses:**

- 404 — Route not found

---

## Auth APIs

*Backend:* `backend/routes/authRoutes.js`  
*Frontend:* `frontend/src/services/authService.ts` (TypeScript; referenced below as authService)

---

### Register Patient

**Method:** POST  
**URL:** `{{baseUrl}}/auth/register/patient`  
**Auth Required:** No  
**Frontend Service:** authService — *registration flow may call API directly; mock flow uses `sendOtp()`*

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "fullName": "Ravi Kadam",
  "phone": "9876543210",
  "email": "ravi@gmail.com",
  "password": "Test@1234"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Patient registered. OTP sent to phone."
}
```

**Error Responses:**

- 400 — `{ "success": false, "message": "fullName, phone and password are required", "code": "VALIDATION" }`
- 400 — `{ "success": false, "message": "Invalid phone number", "code": "VALIDATION" }`
- 409 — `{ "success": false, "message": "Record already exists", "code": "DUPLICATE" }`
- 500 — `{ "success": false, "message": "Internal server error" }`

**Frontend Usage:**

```typescript
// Direct API (no named export registerPatient in authService.ts)
import client from '@/services/apiClient'
await client.post('/auth/register/patient', { fullName, phone, email, password })
```

---

### Register Doctor

**Method:** POST  
**URL:** `{{baseUrl}}/auth/register/doctor`  
**Auth Required:** No  
**Frontend Service:** authService — *direct API / registration UI*

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "fullName": "Dr. Sameer Patil",
  "phone": "9123456789",
  "email": "sameer@gmail.com",
  "password": "Test@1234",
  "specialization": "Orthopedic",
  "licenseNumber": "MH-123456",
  "clinicName": "City Care Hospital",
  "clinicAddress": "Mumbai, Maharashtra",
  "yearsOfExperience": 10,
  "consultationFee": 500
}
```

**Success Response (201):**

```json
{
  "success": true,
  "message": "Doctor registered. OTP sent to phone."
}
```

**Error Responses:**

- 400 — `{ "success": false, "message": "Required fields missing", "code": "VALIDATION" }`
- 400 — `{ "success": false, "message": "Invalid phone number", "code": "VALIDATION" }`
- 409 — `{ "success": false, "message": "Record already exists", "code": "DUPLICATE" }`
- 500 — Internal server error

**Frontend Usage:**

```typescript
await client.post('/auth/register/doctor', { fullName, phone, email, password, specialization, licenseNumber, clinicName, clinicAddress, yearsOfExperience, consultationFee })
```

---

### Verify Registration OTP

**Method:** POST  
**URL:** `{{baseUrl}}/auth/verify-otp`  
**Auth Required:** No  
**Frontend Service:** authService.ts → `verifyOtp(mobile, otp)`

**Headers:**

```
Content-Type: application/json
```

**Body (backend expects `phone`; frontend sends `mobile`):**

```json
{
  "phone": "9876543210",
  "otp": "123456",
  "role": "patient"
}
```

*Frontend payload:* `{ "mobile": "9876543210", "otp": "123456" }` — include `role` and use `phone` (or `mobile` mapped server-side in legacy) for Postman.

**Success Response (200):**

```json
{
  "success": true,
  "message": "Phone verified successfully.",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": { "id": "uuid", "mobile": "+919876543210", "role": "PATIENT" },
  "role": "PATIENT",
  "isNewUser": false
}
```

**Error Responses:**

- 400 — `{ "success": false, "message": "phone and otp are required", "code": "VALIDATION" }`
- 400 — `{ "success": false, "message": "Invalid OTP", "code": "INVALID_OTP" }`
- 400 — `{ "success": false, "message": "OTP has expired. Please request a new one.", "code": "OTP_EXPIRED" }`
- 404 — `{ "success": false, "message": "User not found", "code": "NOT_FOUND" }`

**Frontend Usage:**

```typescript
import { verifyOtp } from '@/services/authService'
const result = await verifyOtp(mobile, otp)
```

---

### Login (Step 1 — Send OTP)

**Method:** POST  
**URL:** `{{baseUrl}}/auth/login`  
**Auth Required:** No  
**Frontend Service:** authService.ts → `loginInitiate(params)`

**Headers:**

```
Content-Type: application/json
```

**Body — Email + password OTP:**

```json
{
  "userRole": "patient",
  "login_method": "email_password_otp",
  "email": "ravi@gmail.com",
  "password": "Test@1234"
}
```

**Body — Mobile OTP:**

```json
{
  "userRole": "patient",
  "login_method": "mobile_otp",
  "mobile": "9876543210"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "phone": "+919876543210"
}
```

**Error Responses:**

- 400 — `{ "success": false, "message": "email and password are required", "code": "VALIDATION" }`
- 400 — `{ "success": false, "message": "Invalid credentials. Please try again.", "code": "INVALID_CREDENTIALS" }`
- 400 — `{ "success": false, "message": "Unable to process request. Please check your details.", "code": "NOT_FOUND" }`
- 400 — `{ "success": false, "message": "Invalid login method", "code": "VALIDATION" }`
- 403 — `{ "success": false, "message": "Please verify your phone number first", "code": "NOT_VERIFIED" }`

**Frontend Usage:**

```typescript
import { loginInitiate } from '@/services/authService'
await loginInitiate({ userRole: 'patient', login_method: 'email_password_otp', email, password })
```

---

### Verify Login OTP (Step 2)

**Method:** POST  
**URL:** `{{baseUrl}}/auth/verify-login-otp`  
**Auth Required:** No  
**Frontend Service:** authService.ts → `loginComplete()` (also tries legacy `/auth/login/verify`)

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "phone": "9876543210",
  "otp": "123456",
  "role": "patient"
}
```

**Legacy body (frontend `loginComplete`):**

```json
{
  "userRole": "patient",
  "login_method": "email_password_otp",
  "otp": "123456"
}
```

*Use `POST {{baseUrl}}/auth/login/verify` for legacy shape above.*

**Success Response (200):**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "uuid",
    "fullName": "Ravi Kadam",
    "phone": "+919876543210",
    "email": "ravi@gmail.com",
    "role": "PATIENT"
  },
  "role": "PATIENT"
}
```

**Error Responses:**

- 400 — `{ "success": false, "message": "phone and otp are required", "code": "VALIDATION" }`
- 400 — `{ "success": false, "message": "Invalid OTP", "code": "INVALID_OTP" }`
- 400 — `{ "success": false, "message": "Invalid credentials", "code": "INVALID_CREDENTIALS" }`
- 400 — `{ "success": false, "message": "No pending OTP", "code": "NO_PENDING" }` *(legacy `/auth/login/verify`)*

**Frontend Usage:**

```typescript
import { loginComplete } from '@/services/authService'
const session = await loginComplete({ userRole: 'patient', login_method: 'email_password_otp', otp })
```

---

### Resend OTP (Registration)

**Method:** POST  
**URL:** `{{baseUrl}}/auth/resend-otp`  
**Auth Required:** No  
**Frontend Service:** *No dedicated export; use API directly*

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "phone": "9876543210"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "OTP resent successfully."
}
```

**Error Responses:**

- 400 — `{ "success": false, "message": "phone is required", "code": "VALIDATION" }`
- 404 — `{ "success": false, "message": "User not found", "code": "NOT_FOUND" }`

---

### Forgot Password

**Method:** POST  
**URL:** `{{baseUrl}}/auth/forgot-password`  
**Auth Required:** No  
**Frontend Service:** *Not wired in UI yet*

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "email": "ravi@gmail.com",
  "role": "patient"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "If the account exists, an OTP has been sent to the registered phone."
}
```

**Error Responses:**

- 400 — `{ "success": false, "message": "email is required", "code": "VALIDATION" }`

---

### Reset Password

**Method:** POST  
**URL:** `{{baseUrl}}/auth/reset-password`  
**Auth Required:** No  
**Frontend Service:** *Not wired in UI yet*

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "phone": "9876543210",
  "otp": "123456",
  "newPassword": "NewTest@1234"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "message": "Password reset successfully."
}
```

**Error Responses:**

- 400 — `{ "success": false, "message": "phone, otp and newPassword are required", "code": "VALIDATION" }`
- 400 — `{ "success": false, "message": "Invalid OTP", "code": "INVALID_OTP" }`

---

### Send OTP (Legacy Registration)

**Method:** POST  
**URL:** `{{baseUrl}}/auth/send-otp`  
**Auth Required:** No  
**Frontend Service:** authService.ts → `sendOtp(mobile, flowRole?)`

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "mobile": "9876543210",
  "role": "patient"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "isNewUser": true
}
```

**Error Responses:**

- 400 — Validation / invalid phone
- 500 — Internal server error

**Frontend Usage:**

```typescript
import { sendOtp } from '@/services/authService'
const result = await sendOtp(mobile, 'patient')
```

---

### Login Verify OTP (Legacy)

**Method:** POST  
**URL:** `{{baseUrl}}/auth/login/verify`  
**Auth Required:** No  
**Frontend Service:** authService.ts → `loginComplete(params)`

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "userRole": "patient",
  "login_method": "email_password_otp",
  "otp": "123456"
}
```

**Success Response (200):** Same as **Verify Login OTP**

**Error Responses:**

- 400 — `{ "success": false, "message": "No pending OTP", "code": "NO_PENDING" }`
- 400 — Invalid OTP / credentials

---

### Login Resend OTP (Legacy)

**Method:** POST  
**URL:** `{{baseUrl}}/auth/login/resend-otp`  
**Auth Required:** No  
**Frontend Service:** authService.ts → `loginResendOtp(params)`

**Headers:**

```
Content-Type: application/json
```

**Body:**

```json
{
  "userRole": "patient",
  "login_method": "email_password_otp"
}
```

*Note: Backend `resendOtp` expects `phone` in body; this legacy route may need `phone` added for server resend to work.*

**Success Response (200):**

```json
{
  "success": true,
  "message": "OTP resent successfully."
}
```

**Frontend Usage:**

```typescript
import { loginResendOtp } from '@/services/authService'
await loginResendOtp({ userRole: 'patient', login_method: 'email_password_otp' })
```

---

## Patient APIs (Spec Routes)

*Backend:* `backend/routes/patientRoutes.js`  
*Frontend:* `frontend/src/services/patientsService.ts` — uses **legacy** paths for profile/history; spec routes available for Postman.

---

### Get Patient Profile

**Method:** GET  
**URL:** `{{baseUrl}}/patient/profile`  
**Auth Required:** Yes (Patient JWT)  
**Frontend Service:** patientsService.ts → `getProfile()` uses legacy `GET /patients/me`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body:** None

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "Ravi Kadam",
    "phone": "+919876543210",
    "email": "ravi@gmail.com",
    "age": 28,
    "gender": "MALE",
    "isVerified": true
  }
}
```

**Error Responses:**

- 401 — Unauthorized  
- 403 — Wrong role (doctor token)  
- 404 — Patient not found

---

### Update Patient Profile

**Method:** PUT  
**URL:** `{{baseUrl}}/patient/update-profile`  
**Auth Required:** Yes (Patient)  
**Frontend Service:** patientsService.ts → `updateProfile()` → legacy `PUT /patients/me`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body:**

```json
{
  "fullName": "Ravi Kadam",
  "age": 28,
  "gender": "MALE",
  "height": 175,
  "weight": 70,
  "bloodGroup": "B+",
  "email": "ravi@gmail.com",
  "address": "Mumbai",
  "emergencyContact": "9876500000"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": { "id": "uuid", "fullName": "Ravi Kadam", "age": 28 }
}
```

**Error Responses:**

- 401 / 403 / 404 / 500

---

### Upload Patient Picture

**Method:** POST  
**URL:** `{{baseUrl}}/patient/upload-picture`  
**Auth Required:** Yes (Patient)  
**Frontend Service:** *No dedicated service export*

**Headers:**

```
Authorization: Bearer {{token}}
Content-Type: multipart/form-data
```

**Body (form-data):**

| Key | Type | Value |
|-----|------|-------|
| image | file | profile.jpg |

**Success Response (200):**

```json
{
  "success": true,
  "profilePicture": "https://res.cloudinary.com/..."
}
```

**Error Responses:**

- 400 — `{ "success": false, "message": "Image file is required", "code": "VALIDATION" }`
- 401 — Unauthorized

---

### Get Patient Consultations

**Method:** GET  
**URL:** `{{baseUrl}}/patient/consultations`  
**Auth Required:** Yes (Patient)  
**Frontend Service:** consultationsService.ts → `getConsultations()` uses legacy `GET /consultations`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "symptoms": "Fever and headache",
      "status": "pending",
      "doctorId": "uuid",
      "createdAt": "2026-05-19T10:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

- 401 / 403

---

### Get Patient Prescriptions

**Method:** GET  
**URL:** `{{baseUrl}}/patient/prescriptions`  
**Auth Required:** Yes (Patient)  
**Frontend Service:** prescriptionsService.ts → `getPrescriptions()` uses legacy `GET /prescriptions`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "diagnosis": "Viral fever",
      "status": "approved",
      "medicines": []
    }
  ]
}
```

---

### Get Medical History

**Method:** GET  
**URL:** `{{baseUrl}}/patient/medical-history`  
**Auth Required:** Yes (Patient)  
**Frontend Service:** patientsService.ts → `getMedicalHistory()` → legacy `GET /patients/me/medical-history`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "chronicDiseases": ["Diabetes"],
    "allergies": ["Penicillin"],
    "currentMedicines": ["Metformin"]
  }
}
```

---

### Update Medical History

**Method:** PUT  
**URL:** `{{baseUrl}}/patient/medical-history`  
**Auth Required:** Yes (Patient)  
**Frontend Service:** patientsService.ts → `updateMedicalHistory()` → legacy `PUT /patients/me/medical-history`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body:**

```json
{
  "chronicDiseases": ["Diabetes"],
  "allergies": ["Penicillin"],
  "currentMedicines": ["Metformin"]
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "chronicDiseases": ["Diabetes"],
    "allergies": ["Penicillin"],
    "currentMedicines": ["Metformin"]
  }
}
```

---

## Doctor APIs (Spec Routes)

*Backend:* `backend/routes/doctorRoutes.js` + public `GET /api/doctors`  
*Frontend:* `frontend/src/services/doctorsService.ts`

---

### Get Doctor Profile

**Method:** GET  
**URL:** `{{baseUrl}}/doctor/profile`  
**Auth Required:** Yes (Doctor JWT)  
**Frontend Service:** *Local storage / dashboard; no API wrapper*

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "Dr. Sameer Patil",
    "specialization": "Orthopedic",
    "availability": true
  }
}
```

---

### Update Doctor Profile (Spec)

**Method:** PUT  
**URL:** `{{baseUrl}}/doctor/update-profile`  
**Auth Required:** Yes (Doctor)  
**Frontend Service:** doctorsService.ts → `updateDoctorProfile()` uses legacy **`PATCH {{baseUrl}}/doctor/update-profile`**

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body (spec):**

```json
{
  "fullName": "Dr. Sameer Patil",
  "phone": "9123456789",
  "email": "sameer@gmail.com",
  "specialization": "Orthopedic",
  "clinicName": "City Care Hospital",
  "consultationFee": 500,
  "yearsOfExperience": 10
}
```

**Body (legacy PATCH — frontend):**

```json
{
  "fullName": "Dr. Sameer Patil",
  "mobile": "9123456789",
  "email": "sameer@gmail.com",
  "profilePictureUrl": "",
  "specialization": "Orthopedic",
  "hospital": "City Care Hospital",
  "consultationFee": "500"
}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": { "id": "uuid", "fullName": "Dr. Sameer Patil" }
}
```

**Frontend Usage:**

```typescript
import { updateDoctorProfile } from '@/services/doctorsService'
await updateDoctorProfile({ fullName, mobile, email, profilePictureUrl, specialization, hospital, consultationFee })
```

---

### Upload Doctor Picture

**Method:** POST  
**URL:** `{{baseUrl}}/doctor/upload-picture`  
**Auth Required:** Yes (Doctor)  

**Headers:**

```
Authorization: Bearer {{token}}
Content-Type: multipart/form-data
```

**Body:** form field `image` (file)

**Success Response (200):**

```json
{
  "success": true,
  "profilePicture": "https://res.cloudinary.com/..."
}
```

---

### Toggle Doctor Availability

**Method:** PUT  
**URL:** `{{baseUrl}}/doctor/availability`  
**Auth Required:** Yes (Doctor)  

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body:**

```json
{
  "availability": false
}
```

**Success Response (200):**

```json
{
  "success": true,
  "availability": false
}
```

**Error Responses:**

- 400 — `{ "success": false, "message": "availability must be boolean", "code": "VALIDATION" }`

---

### Get Doctor Patients

**Method:** GET  
**URL:** `{{baseUrl}}/doctor/patients`  
**Auth Required:** Yes (Doctor)  

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "patient-uuid",
      "fullName": "Ravi Kadam",
      "age": 28,
      "gender": "MALE",
      "consultationId": "consultation-uuid"
    }
  ]
}
```

---

### Get Doctor Consultations

**Method:** GET  
**URL:** `{{baseUrl}}/doctor/consultations`  
**Auth Required:** Yes (Doctor)  
**Frontend Service:** consultationsService.ts → `getDoctorConsultations()` uses legacy `GET /consultations/doctor`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": []
}
```

---

### List Doctors by Specialization (Public)

**Method:** GET  
**URL:** `{{baseUrl}}/doctors?specialization=Orthopedic`  
**Auth Required:** No  
**Frontend Service:** *Mock doctor list in utils; public API for booking*

**Headers:**

```
Content-Type: application/json
```

**Query Params:**

| Param | Example |
|-------|---------|
| specialization | Orthopedic |

**Success Response (200):**

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "fullName": "Dr. Sameer Patil",
      "specialization": "Orthopedic",
      "consultationFee": 500,
      "rating": 0,
      "availability": true
    }
  ]
}
```

---

### List Doctors (Alternate Public Route)

**Method:** GET  
**URL:** `{{baseUrl}}/doctor/list?specialization=Orthopedic`  
**Auth Required:** No  

Same response shape as **`GET /doctors`**.

---

## Consultation APIs (Spec Routes)

*Backend:* `backend/routes/consultationRoutes.js`  
*Frontend:* `frontend/src/services/consultationsService.ts`

---

### Submit Consultation

**Method:** POST  
**URL:** `{{baseUrl}}/consultation/submit`  
**Auth Required:** Yes (Patient)  
**Frontend Service:** consultationsService.ts → `submitConsultation()` uses legacy `POST /consultations`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body (spec):**

```json
{
  "doctorId": "doctor-uuid",
  "symptoms": "Fever, headache for 2 days",
  "questionAnswers": { "duration": "2 days", "fever": "yes" },
  "additionalNotes": "No travel history",
  "detectedSpecialization": "General",
  "possibleDisease": "Viral infection",
  "confidence": "medium",
  "riskLevel": "moderate",
  "disclaimer": "AI suggestion only"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "consultation-uuid",
    "patientId": "patient-uuid",
    "doctorId": "doctor-uuid",
    "symptoms": "Fever, headache for 2 days",
    "status": "pending"
  }
}
```

**Error Responses:**

- 400 — `{ "success": false, "message": "doctorId and symptoms are required", "code": "VALIDATION" }`
- 400 — `{ "success": false, "message": "Doctor not found", "code": "NOT_FOUND" }`

**Frontend Usage:**

```typescript
import { submitConsultation } from '@/services/consultationsService'
await submitConsultation(payload)
```

---

### Get Consultation By ID

**Method:** GET  
**URL:** `{{baseUrl}}/consultation/{{consultationId}}`  
**Auth Required:** Yes (Patient or Doctor on that case)  
**Frontend Service:** consultationsService.ts → `getConsultation(id)` → legacy `GET /consultations/:id`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "consultation-uuid",
    "symptoms": "Fever",
    "status": "pending",
    "patient": {},
    "doctor": {}
  }
}
```

**Error Responses:**

- 403 — Forbidden  
- 404 — Consultation not found

---

### Update Consultation Status

**Method:** PUT  
**URL:** `{{baseUrl}}/consultation/{{consultationId}}/status`  
**Auth Required:** Yes (Doctor)  
**Frontend Service:** consultationsService.ts → `updateConsultationCaseStatus()` → legacy **`PATCH /consultations/:id/status`**

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body (spec):**

```json
{
  "status": "reviewed"
}
```

*Allowed values:* `pending`, `reviewed`, `completed`

**Success Response (200):**

```json
{
  "success": true,
  "data": { "id": "consultation-uuid", "status": "reviewed" }
}
```

---

### Get Patient Consultation History

**Method:** GET  
**URL:** `{{baseUrl}}/consultation/patient/{{patientId}}`  
**Auth Required:** Yes (Patient; `patientId` must match JWT user id)  

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": []
}
```

**Error Responses:**

- 403 — `{ "success": false, "message": "Forbidden", "code": "FORBIDDEN" }`

---

### Get Doctor Consultation History

**Method:** GET  
**URL:** `{{baseUrl}}/consultation/doctor/{{doctorId}}`  
**Auth Required:** Yes (Doctor; `doctorId` must match JWT user id)  

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": []
}
```

---

## Prescription APIs (Spec Routes)

*Backend:* `backend/routes/prescriptionRoutes.js`  
*Frontend:* `frontend/src/services/prescriptionsService.ts`

---

### Create Prescription

**Method:** POST  
**URL:** `{{baseUrl}}/prescription/create`  
**Auth Required:** Yes (Doctor)  
**Frontend Service:** prescriptionsService.ts → `createPrescription()` → legacy `POST /prescriptions`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body:**

```json
{
  "consultationId": "consultation-uuid",
  "patientId": "patient-uuid",
  "diagnosis": "Viral fever",
  "medicines": [
    {
      "name": "Paracetamol",
      "dosage": "500mg",
      "frequency": "Twice daily",
      "duration": "5 days"
    }
  ],
  "advice": "Rest and fluids",
  "followUpDate": "2026-05-26T00:00:00.000Z"
}
```

**Success Response (201):**

```json
{
  "success": true,
  "data": {
    "id": "prescription-uuid",
    "status": "draft",
    "diagnosis": "Viral fever"
  }
}
```

**Error Responses:**

- 400 — Missing required fields  
- 404 — Consultation not found

**Frontend Usage:**

```typescript
import { createPrescription } from '@/services/prescriptionsService'
await createPrescription(data)
```

---

### Approve Prescription

**Method:** PUT  
**URL:** `{{baseUrl}}/prescription/{{prescriptionId}}/approve`  
**Auth Required:** Yes (Doctor)  
**Frontend Service:** prescriptionsService.ts → `approvePrescription()` → legacy **`PATCH /prescriptions/:id/approve`**

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body:** None (or empty JSON `{}`)

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "prescription-uuid",
    "status": "approved"
  }
}
```

---

### Get Prescription By ID

**Method:** GET  
**URL:** `{{baseUrl}}/prescription/{{prescriptionId}}`  
**Auth Required:** Yes (Patient or Doctor on that prescription)  
**Frontend Service:** prescriptionsService.ts → `getPrescription(id)` → legacy `GET /prescriptions/:id`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "prescription-uuid",
    "diagnosis": "Viral fever",
    "medicines": [],
    "status": "approved"
  }
}
```

---

### Get Patient Prescription History

**Method:** GET  
**URL:** `{{baseUrl}}/prescription/patient/{{patientId}}`  
**Auth Required:** Yes (Patient; id must match token)  

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": []
}
```

---

### Get Prescription By Consultation

**Method:** GET  
**URL:** `{{baseUrl}}/prescription/consultation/{{consultationId}}`  
**Auth Required:** Yes (Doctor)  

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Success Response (200):**

```json
{
  "success": true,
  "data": {
    "id": "prescription-uuid",
    "consultationId": "consultation-uuid"
  }
}
```

---

## Legacy API Routes (Used by Frontend)

*Backend:* `backend/routes/legacyRoutes.js` mounted at `/api`

| Method | URL | Auth | Frontend |
|--------|-----|------|----------|
| GET | `/patients/me` | Patient | `getProfile()` |
| PUT | `/patients/me` | Patient | `updateProfile()` |
| GET | `/patients/me/medical-history` | Patient | `getMedicalHistory()` |
| PUT | `/patients/me/medical-history` | Patient | `updateMedicalHistory()` |
| PATCH | `/doctor/update-profile` | Doctor | `updateDoctorProfile()` |
| POST | `/consultations` | Patient | `submitConsultation()` |
| GET | `/consultations` | Patient/Doctor | `getConsultations()` |
| GET | `/consultations/pending` | Doctor | `getPendingConsultations()` |
| GET | `/consultations/doctor` | Doctor | `getDoctorConsultations()` |
| GET | `/consultations/:id` | Auth | `getConsultation()` |
| PATCH | `/consultations/:id/status` | Doctor | `updateConsultationCaseStatus()` |
| GET | `/prescriptions` | Patient/Doctor | `getPrescriptions()` |
| GET | `/prescriptions/:id` | Auth | `getPrescription()` |
| POST | `/prescriptions` | Doctor | `createPrescription()` |
| PATCH | `/prescriptions/:id` | Doctor | `updatePrescription()` |
| PATCH | `/prescriptions/:id/approve` | Doctor | `approvePrescription()` |

All legacy protected routes use:

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

---

## Follow-Up APIs (Frontend Only — Route Not Mounted)

*Defined in `backend/routes/followUpRoutes.js` but **not** registered in `server.js` yet.*

### Book Follow-Up

**Method:** POST  
**URL:** `{{baseUrl}}/follow-ups`  
**Auth Required:** Yes (Patient)  
**Frontend Service:** followUpsService.ts → `bookFollowUp(data)`

**Headers:**

```
Content-Type: application/json
Authorization: Bearer {{token}}
```

**Body:**

```json
{
  "doctorId": "doctor-uuid",
  "scheduledAt": "2026-05-25T10:00:00.000Z",
  "notes": "Follow-up for fever"
}
```

**Expected Success (201):** Stub JSON with generated id

---

### Get My Follow-Ups

**Method:** GET  
**URL:** `{{baseUrl}}/follow-ups/me`  
**Auth Required:** Yes (Patient)  
**Frontend Service:** followUpsService.ts → `getMyFollowUps()`

**Success Response (200):** `[]` (stub)

---

## Prescription PDF (Frontend Only)

**Method:** GET  
**URL:** `{{baseUrl}}/prescriptions/{{prescriptionId}}/pdf`  
**Auth Required:** Yes  
**Frontend Service:** prescriptionsService.ts → `downloadPdf(id)`  

*Not implemented on backend — returns mock blob on failure.*

---

## Quick Reference — Spec Endpoints

| # | Method | Path | Auth |
|---|--------|------|------|
| 1 | POST | `/auth/register/patient` | No |
| 2 | POST | `/auth/register/doctor` | No |
| 3 | POST | `/auth/verify-otp` | No |
| 4 | POST | `/auth/login` | No |
| 5 | POST | `/auth/verify-login-otp` | No |
| 6 | POST | `/auth/resend-otp` | No |
| 7 | POST | `/auth/forgot-password` | No |
| 8 | POST | `/auth/reset-password` | No |
| 9 | GET | `/patient/profile` | Patient |
| 10 | PUT | `/patient/update-profile` | Patient |
| 11 | POST | `/patient/upload-picture` | Patient |
| 12 | GET | `/patient/consultations` | Patient |
| 13 | GET | `/patient/prescriptions` | Patient |
| 14 | GET | `/patient/medical-history` | Patient |
| 15 | PUT | `/patient/medical-history` | Patient |
| 16 | GET | `/doctor/profile` | Doctor |
| 17 | PUT | `/doctor/update-profile` | Doctor |
| 18 | POST | `/doctor/upload-picture` | Doctor |
| 19 | PUT | `/doctor/availability` | Doctor |
| 20 | GET | `/doctor/patients` | Doctor |
| 21 | GET | `/doctor/consultations` | Doctor |
| 22 | GET | `/doctors` | No |
| 23 | POST | `/consultation/submit` | Patient |
| 24 | GET | `/consultation/:id` | Auth |
| 25 | PUT | `/consultation/:id/status` | Doctor |
| 26 | GET | `/consultation/patient/:patientId` | Patient |
| 27 | GET | `/consultation/doctor/:doctorId` | Doctor |
| 28 | POST | `/prescription/create` | Doctor |
| 29 | PUT | `/prescription/:id/approve` | Doctor |
| 30 | GET | `/prescription/:id` | Auth |
| 31 | GET | `/prescription/patient/:patientId` | Patient |
| 32 | GET | `/prescription/consultation/:consultationId` | Doctor |

---

*Generated from backend route files and `frontend/src/services/*.ts`. Import `postman_collection.json` for ready-to-run requests.*
