// Emergency Detection Service
// Always runs BEFORE dataset engine and Groq to catch critical cases immediately

const EMERGENCY_KEYWORDS = [
  'chest pain', 'chest pressure', 'chest tightness', 'heart attack', 'cardiac arrest',
  'breathing difficulty', "can't breathe", 'cannot breathe', 'shortness of breath', 'no breath',
  'blood vomiting', 'vomiting blood', 'coughing blood', 'blood in stool', 'rectal bleeding',
  'unconscious', 'unconsciousness', 'fainted', 'fainting', 'passed out', 'blacked out',
  'seizure', 'seizures', 'convulsion', 'convulsions', 'epilepsy attack',
  'stroke', 'face drooping', 'arm weakness', 'speech difficulty', 'sudden numbness',
  'severe bleeding', 'uncontrolled bleeding', 'heavy bleeding',
  'anaphylaxis', 'severe allergic reaction', 'throat swelling', 'throat closing',
  'overdose', 'drug overdose', 'poisoning', 'toxic ingestion',
  'head trauma', 'severe head injury', 'skull fracture',
  'paralysis', 'sudden paralysis', 'limb paralysis',
  'choking', 'airway obstruction',
  'severe burn', 'electric shock',
  'diabetic coma', 'hypoglycemic shock',
]

/**
 * Detects emergency keywords in the symptom text.
 * @param {string} symptoms - Raw symptom text from patient
 * @returns {{ isEmergency: boolean, ...details? }}
 */
export const detectEmergency = (symptoms) => {
  if (!symptoms || typeof symptoms !== 'string') {
    return { isEmergency: false }
  }

  const lower = symptoms.toLowerCase()
  const matched = EMERGENCY_KEYWORDS.find((keyword) => lower.includes(keyword))

  if (!matched) {
    return { isEmergency: false }
  }

  return {
    isEmergency: true,
    riskLevel: 'Critical',
    matchedKeyword: matched,
    detectedSymptom: 'Medical Emergency',
    bodySystem: 'Emergency',
    disease: 'Potential Medical Emergency',
    specialization: 'Emergency Medicine',
    confidence: 95,
    questions: [],
    advice: '⚠️ EMERGENCY: Call emergency services immediately. Dial 112 or 108. Do not wait.',
    emergencyMessage: `Emergency symptom detected: "${matched}". Please call emergency services (112/108) immediately.`,
  }
}
