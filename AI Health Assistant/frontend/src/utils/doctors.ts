import type { SymptomQuestionData } from '@/types/symptomFlow'

const includesAny = (text: string, terms: string[]) => terms.some((term) => text.includes(term))

export const recommendSpecialization = (
  symptomsText: string,
  symptomData: SymptomQuestionData,
  patientAge: number,
): string => {
  if (patientAge < 12) {
    return 'Pediatrician'
  }

  const text = `${symptomsText} ${symptomData.additionalNotes} ${symptomData.moreQuestionsVoiceNotes}`.toLowerCase()

  if (
    includesAny(text, [
      'chest pain',
      'chest',
      'shortness of breath',
      'breathless',
      'palpitation',
      'palpitations',
      'heart',
    ])
  ) {
    return 'Cardiologist'
  }

  if (includesAny(text, ['rash', 'itching', 'skin', 'acne', 'dermat', 'lesion'])) {
    return 'Dermatologist'
  }

  if (includesAny(text, ['ear pain', 'throat', 'nasal', 'sinus', 'ent', 'nose', 'congestion'])) {
    return 'ENT Specialist'
  }

  if (includesAny(text, ['joint', 'bone', 'back pain', 'fracture', 'knee', 'orthopedic', 'spine'])) {
    return 'Orthopedic'
  }

  const feverPattern =
    symptomData.hasFever === 'yes' ||
    includesAny(text, ['fever', 'chills', 'body pain', 'headache', 'weakness'])

  if (feverPattern) {
    return 'General Physician'
  }

  return 'General Physician'
}

export const getSymptomTagsForDisplay = (
  symptomsText: string,
  symptomData: SymptomQuestionData,
): string[] => {
  const tags: string[] = []
  if (symptomData.hasFever === 'yes') tags.push('Fever')
  if (symptomData.hasChills === 'yes') tags.push('Chills')
  if (symptomData.temperature === 'high' || symptomData.temperature === 'very_high') {
    tags.push('High temperature')
  }
  if (includesAny(symptomsText.toLowerCase(), ['body pain', 'pain'])) tags.push('Body Pain')
  if (includesAny(symptomsText.toLowerCase(), ['headache'])) tags.push('Headache')
  return tags.length ? tags : symptomsText.split(/[.,\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 3)
}
