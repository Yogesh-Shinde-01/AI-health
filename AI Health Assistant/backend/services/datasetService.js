// Dataset Engine Service
// Primary AI engine — runs before Groq API to reduce API calls and costs
// Uses score-based keyword matching against symptoms.json

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataPath = join(__dirname, '../data/symptoms.json')

// Load dataset once at startup
let dataset = []
try {
  dataset = JSON.parse(readFileSync(dataPath, 'utf-8'))
} catch (err) {
  console.error('[DatasetService] Failed to load symptoms.json:', err.message)
}

/**
 * Tokenizes and cleans a symptom string into individual words/phrases.
 * @param {string} text
 * @returns {string[]}
 */
const tokenize = (text) =>
  text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2)

/**
 * Scores a dataset entry against the patient's symptom text.
 * Counts how many keywords appear in the symptom string.
 * @param {object} entry - Dataset entry from symptoms.json
 * @param {string} lower - Lowercased symptom text
 * @param {string[]} tokens - Tokenized symptom words
 * @returns {number} score (0 = no match)
 */
const scoreEntry = (entry, lower, tokens) => {
  let score = 0
  for (const keyword of entry.keywords) {
    const kw = keyword.toLowerCase()
    // Full phrase match scores higher
    if (lower.includes(kw)) {
      score += kw.includes(' ') ? 3 : 2
      continue
    }
    // Partial token match
    const kwTokens = kw.split(/\s+/)
    const matched = kwTokens.filter((kt) => tokens.includes(kt))
    if (matched.length > 0) {
      score += matched.length
    }
  }
  return score
}

/**
 * Finds the best-matching symptom dataset entry.
 * @param {string} symptoms - Raw symptom text from patient
 * @returns {{ found: boolean, ...matchData? }}
 */
export const findSymptomMatch = (symptoms) => {
  if (!symptoms || !dataset.length) {
    return { found: false }
  }

  const lower = symptoms.toLowerCase()
  const tokens = tokenize(symptoms)

  let bestScore = 0
  let bestMatch = null

  for (const entry of dataset) {
    const score = scoreEntry(entry, lower, tokens)
    if (score > bestScore) {
      bestScore = score
      bestMatch = entry
    }
  }

  // Minimum score threshold to avoid false positives
  if (bestScore < 2 || !bestMatch) {
    return { found: false }
  }

  return {
    found: true,
    score: bestScore,
    id: bestMatch.id,
    detectedSymptom: bestMatch.disease,
    bodySystem: bestMatch.bodySystem,
    disease: bestMatch.disease,
    specialization: bestMatch.specialization,
    riskLevel: bestMatch.riskLevel,
    confidence: bestMatch.confidence,
    questions: bestMatch.questions,
    advice: bestMatch.advice,
  }
}
