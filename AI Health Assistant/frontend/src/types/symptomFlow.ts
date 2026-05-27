export type FeverAnswer = 'yes' | 'no' | 'not_sure'
export type TemperatureBand = 'normal' | 'low' | 'mild' | 'high' | 'very_high'
export type FeverDuration = 'today' | '1-2days' | '3-5days' | 'more'
export type ChillsAnswer = 'yes' | 'no' | 'not_sure'

export interface SymptomQuestionData {
  hasFever: FeverAnswer | null
  temperature: TemperatureBand | null
  feverDuration: FeverDuration | null
  hasChills: ChillsAnswer | null
  additionalNotes: string
  /** Optional voice capture on More Questions screen */
  moreQuestionsVoiceNotes: string
}

export const initialSymptomQuestionData = (): SymptomQuestionData => ({
  hasFever: null,
  temperature: null,
  feverDuration: null,
  hasChills: null,
  additionalNotes: '',
  moreQuestionsVoiceNotes: '',
})

export function computeRiskFromSymptomData(data: SymptomQuestionData): 'LOW' | 'MEDIUM' | 'HIGH' {
  const highTemp = data.temperature === 'high' || data.temperature === 'very_high'
  const prolonged = data.feverDuration === '3-5days' || data.feverDuration === 'more'
  const chillsYes = data.hasChills === 'yes'
  if (highTemp && prolonged && chillsYes) {
    return 'HIGH'
  }
  const lowTemp = data.temperature === 'normal' || data.temperature === 'low'
  const shortDuration = data.feverDuration === 'today' || data.feverDuration === '1-2days'
  if (lowTemp && shortDuration) {
    return 'LOW'
  }
  return 'MEDIUM'
}
