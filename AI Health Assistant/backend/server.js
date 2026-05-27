import express from 'express'
import cors from 'cors'
import { env } from './config/env.js'
import authRoutes from './routes/authRoutes.js'
import patientRoutes from './routes/patientRoutes.js'
import doctorRoutes from './routes/doctorRoutes.js'
import { listDoctors } from './controllers/doctorController.js'
import { asyncHandler } from './utils/asyncHandler.js'
import consultationRoutes from './routes/consultationRoutes.js'
import prescriptionRoutes from './routes/prescriptionRoutes.js'
import legacyRoutes from './routes/legacyRoutes.js'
import followUpRoutes from './routes/followUpRoutes.js'
import aiRoutes from './routes/aiRoutes.js'
import { notFound, errorHandler } from './middleware/errorMiddleware.js'

const app = express()

const corsOptions = {
  origin(origin, callback) {
    if (!origin || origin.startsWith('http://localhost')) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 200,
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions))
app.use(express.json({ limit: '2mb' }))

app.get('/api/health', (_req, res) => {
  res.json({ success: true, service: 'ai-health-assistant-api' })
})

// Spec routes
app.use('/api/auth', authRoutes)
app.use('/api/patient', patientRoutes)
app.use('/api/doctor', doctorRoutes)
app.use('/api/consultation', consultationRoutes)
app.use('/api/prescription', prescriptionRoutes)

// Public doctors list (spec: GET /api/doctors)
app.get('/api/doctors', asyncHandler(listDoctors))

// Follow-up routes
app.use('/api/follow-ups', followUpRoutes)

// AI Orchestrator routes (no auth required)
app.use('/api/ai', aiRoutes)

// Frontend legacy paths (/api/patients, /api/consultations, …)
app.use('/api', legacyRoutes)

app.use(notFound)
app.use(errorHandler)

app.listen(env.PORT, () => {
  console.log(`API http://localhost:${env.PORT}/api`)
  console.log('CORS: http://localhost:* (any port)')
})
