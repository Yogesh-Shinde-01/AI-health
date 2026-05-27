// Groq API Service (Fallback AI Engine)
// Only called when dataset engine finds no match
// Uses llama3-70b-8192 model via Groq API

import Groq from 'groq-sdk'

let groqClient = null

const getClient = () => {
  if (!process.env.GROQ_API_KEY) {
    return null
  }
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY })
  }
  return groqClient
}

const SYSTEM_PROMPT = `You are a medical AI assistant. Analyze symptoms and return ONLY a valid JSON object.
No extra text, no markdown, no explanation — just the JSON.`

const ANALYZE_PROMPT = (symptoms) => `
Analyze these patient symptoms: "${symptoms}"

Return ONLY this JSON structure (no extra text):
{
  "detectedSymptom": "main symptom name",
  "bodySystem": "affected body system (e.g. Respiratory, Cardiovascular, Digestive, Neurological, General)",
  "disease": "most likely condition",
  "specialization": "recommended doctor specialization",
  "riskLevel": "Low | Medium | High",
  "confidence": 70,
  "questions": [
    { "question": "follow-up question 1?", "options": ["Option A", "Option B", "Option C"] },
    { "question": "follow-up question 2?", "options": ["Option A", "Option B", "Option C"] },
    { "question": "follow-up question 3?", "options": ["Option A", "Option B", "Option C"] },
    { "question": "follow-up question 4?", "options": ["Option A", "Option B", "Option C"] }
  ],
  "advice": "brief self-care advice"
}
`

const FINAL_ANALYSIS_PROMPT = (symptoms, answers, additionalNotes) => `
Patient symptoms: "${symptoms}"
Patient answers: ${JSON.stringify(answers)}
Additional notes: "${additionalNotes || 'None'}"

Based on all information, return ONLY this JSON:
{
  "disease": "most likely diagnosis",
  "confidence": 75,
  "specialization": "recommended doctor specialization",
  "riskLevel": "Low | Medium | High",
  "advice": "medical advice and next steps"
}
`

/**
 * Parses the AI response, extracting JSON from any wrapper text.
 * @param {string} content
 * @returns {object}
 */
const parseJson = (content) => {
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('No JSON found in response')
  return JSON.parse(jsonMatch[0])
}

/**
 * Analyzes symptoms using Groq LLaMA 3 and returns structured response.
 * @param {string} symptoms
 * @returns {Promise<object>}
 */
export const analyzeWithGroq = async (symptoms) => {
  const client = getClient()
  if (!client) {
    throw new Error('GROQ_API_KEY not configured')
  }

  const completion = await client.chat.completions.create({
    model: 'llama3-70b-8192',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: ANALYZE_PROMPT(symptoms) },
    ],
    temperature: 0.3,
    max_tokens: 800,
  })

  const content = completion.choices[0]?.message?.content ?? ''
  const parsed = parseJson(content)

  return {
    detectedSymptom: parsed.detectedSymptom ?? symptoms.slice(0, 50),
    bodySystem: parsed.bodySystem ?? 'General',
    disease: parsed.disease ?? 'Unknown',
    specialization: parsed.specialization ?? 'General Physician',
    riskLevel: parsed.riskLevel ?? 'Low',
    confidence: Number(parsed.confidence) || 65,
    questions: Array.isArray(parsed.questions) ? parsed.questions.slice(0, 4) : [],
    advice: parsed.advice ?? 'Consult a doctor.',
  }
}

/**
 * Runs final diagnosis after collecting all patient answers.
 * @param {string} symptoms
 * @param {object} answers
 * @param {string} additionalNotes
 * @returns {Promise<object>}
 */
export const finalAnalysisWithGroq = async (symptoms, answers, additionalNotes) => {
  const client = getClient()
  if (!client) {
    throw new Error('GROQ_API_KEY not configured')
  }

  const completion = await client.chat.completions.create({
    model: 'llama3-70b-8192',
    messages: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: FINAL_ANALYSIS_PROMPT(symptoms, answers, additionalNotes) },
    ],
    temperature: 0.3,
    max_tokens: 400,
  })

  const content = completion.choices[0]?.message?.content ?? ''
  const parsed = parseJson(content)

  return {
    disease: parsed.disease ?? 'Unknown',
    confidence: Number(parsed.confidence) || 65,
    specialization: parsed.specialization ?? 'General Physician',
    riskLevel: parsed.riskLevel ?? 'Low',
    advice: parsed.advice ?? 'Consult a doctor.',
  }
}
