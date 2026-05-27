// AI Orchestrator Service
// Coordinates the three-layer AI pipeline:
//   1. Emergency Detection (highest priority — instant return)
//   2. Dataset Engine (primary — free, fast, no API call)
//   3. Groq API (fallback — only when dataset has no match)

import { detectEmergency } from './emergencyService.js'
import { findSymptomMatch } from './datasetService.js'
import { analyzeWithGroq, finalAnalysisWithGroq } from './groqService.js'

/**
 * Normalizes riskLevel strings to a consistent format.
 * Dataset uses "Low"/"Medium"/"High"/"Critical"; frontend uses "LOW"/"MEDIUM"/"HIGH"
 * @param {string} level
 * @returns {string}
 */
const normalizeRisk = (level) => {
  if (!level) return 'LOW'
  const map = {
    low: 'LOW', medium: 'MEDIUM', high: 'HIGH', critical: 'HIGH',
    Critical: 'HIGH', Low: 'LOW', Medium: 'MEDIUM', High: 'HIGH',
  }
  return map[level] ?? level.toUpperCase()
}

/**
 * Step 1: Analyze symptoms — runs emergency check → dataset → Groq fallback.
 * Called from /api/ai/analyze-symptoms
 * @param {string} symptoms - Raw symptom text from patient
 * @returns {Promise<object>} Structured AI response
 */
export const analyzeSymptoms = async (symptoms) => {
  if (!symptoms?.trim()) {
    return {
      isEmergency: false,
      detectedSymptom: '',
      bodySystem: 'General',
      disease: '',
      specialization: 'General Physician',
      riskLevel: 'LOW',
      confidence: 0,
      questions: [],
      advice: '',
      source: 'none',
    }
  }

  // ── Layer 1: Emergency Detection ──────────────────────────────────────────
  const emergency = detectEmergency(symptoms)
  if (emergency.isEmergency) {
    return {
      ...emergency,
      riskLevel: normalizeRisk(emergency.riskLevel),
      source: 'emergency',
    }
  }

  // ── Layer 2: Dataset Engine ───────────────────────────────────────────────
  const datasetResult = findSymptomMatch(symptoms)
  if (datasetResult.found) {
    return {
      isEmergency: false,
      detectedSymptom: datasetResult.detectedSymptom,
      bodySystem: datasetResult.bodySystem,
      disease: datasetResult.disease,
      specialization: datasetResult.specialization,
      riskLevel: normalizeRisk(datasetResult.riskLevel),
      confidence: datasetResult.confidence,
      questions: datasetResult.questions,
      advice: datasetResult.advice,
      source: 'dataset',
    }
  }

  // ── Layer 3: Groq API Fallback ────────────────────────────────────────────
  if (process.env.GROQ_API_KEY) {
    try {
      const groqResult = await analyzeWithGroq(symptoms)
      return {
        isEmergency: false,
        ...groqResult,
        riskLevel: normalizeRisk(groqResult.riskLevel),
        source: 'groq',
      }
    } catch (err) {
      console.error('[AIOrchestrator] Groq fallback failed:', err.message)
    }
  }

  // ── No match found anywhere ───────────────────────────────────────────────
  return {
    isEmergency: false,
    detectedSymptom: symptoms.slice(0, 50),
    bodySystem: 'General',
    disease: '',
    specialization: 'General Physician',
    riskLevel: 'LOW',
    confidence: 0,
    questions: [],
    advice: 'Please consult a doctor for proper evaluation.',
    source: 'none',
  }
}

/**
 * Step 2: Final analysis — runs after all patient answers are collected.
 * Called from /api/ai/final-analysis
 * Uses Groq for richer diagnosis, falls back to dataset result if Groq unavailable.
 * @param {string} symptoms
 * @param {object} answers - Patient's answers to follow-up questions
 * @param {string} additionalNotes
 * @returns {Promise<object>}
 */
export const finalAnalysis = async (symptoms, answers, additionalNotes) => {
  // Try Groq first for final analysis (more context → better result)
  if (process.env.GROQ_API_KEY) {
    try {
      const result = await finalAnalysisWithGroq(symptoms, answers, additionalNotes)
      return {
        ...result,
        riskLevel: normalizeRisk(result.riskLevel),
        source: 'groq',
      }
    } catch (err) {
      console.error('[AIOrchestrator] Final analysis Groq failed:', err.message)
    }
  }

  // Fall back to dataset engine
  const datasetResult = findSymptomMatch(symptoms)
  if (datasetResult.found) {
    return {
      disease: datasetResult.disease,
      confidence: datasetResult.confidence,
      specialization: datasetResult.specialization,
      riskLevel: normalizeRisk(datasetResult.riskLevel),
      advice: datasetResult.advice,
      source: 'dataset',
    }
  }

  return {
    disease: 'Could not determine',
    confidence: 0,
    specialization: 'General Physician',
    riskLevel: 'LOW',
    advice: 'Please consult a General Physician for evaluation.',
    source: 'none',
  }
}
