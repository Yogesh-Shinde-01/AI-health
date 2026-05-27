// AI Routes — no authentication required (symptom analysis is anonymous)
import { Router } from 'express'
import { asyncHandler } from '../utils/asyncHandler.js'
import { analyzeSymptoms, finalAnalysis, nextFollowUpQuestion } from '../services/aiOrchestrator.js'

const router = Router()

/**
 * POST /api/ai/analyze-symptoms
 * Step 1: Run emergency detection → dataset engine → Groq fallback
 * Body: { symptoms: string }
 */
router.post('/analyze-symptoms', asyncHandler(async (req, res) => {
  const { symptoms } = req.body
  if (!symptoms || typeof symptoms !== 'string') {
    return res.status(400).json({ success: false, error: 'symptoms field is required' })
  }
  const result = await analyzeSymptoms(symptoms.trim())
  res.json({ success: true, data: result })
}))

/**
 * POST /api/ai/final-analysis
 * Step 2: Run final AI diagnosis after all Q&A collected
 * Body: { symptoms: string, answers: object, additionalNotes?: string }
 */
router.post('/final-analysis', asyncHandler(async (req, res) => {
  const { symptoms, answers, additionalNotes } = req.body
  if (!symptoms || typeof symptoms !== 'string') {
    return res.status(400).json({ success: false, error: 'symptoms field is required' })
  }
  const result = await finalAnalysis(
    symptoms.trim(),
    answers ?? {},
    additionalNotes ?? '',
  )
  res.json({ success: true, data: result })
}))

/**
 * POST /api/ai/next-question
 * Dynamically generates the next follow-up question (one at a time).
 * Body:
 *  {
 *    symptoms: string,
 *    history: Array<{ question: string, answer: string }>,
 *    additionalNotes?: string
 *  }
 */
router.post('/next-question', asyncHandler(async (req, res) => {
  const { symptoms, history, additionalNotes } = req.body
  if (!symptoms || typeof symptoms !== 'string') {
    return res.status(400).json({ success: false, error: 'symptoms field is required' })
  }
  const safeHistory = Array.isArray(history) ? history : []
  const result = await nextFollowUpQuestion(symptoms.trim(), safeHistory, additionalNotes ?? '')
  res.json({ success: true, data: result })
}))

export default router
