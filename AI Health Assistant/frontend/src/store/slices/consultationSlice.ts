import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { AiQuestion, Consultation, RiskLevel } from '@/types'
import type { SymptomQuestionData } from '@/types/symptomFlow'
import { initialSymptomQuestionData } from '@/types/symptomFlow'

interface ConsultationState {
  currentSymptoms: string
  additionalNotes: string
  symptomData: SymptomQuestionData
  aiAnswers: Record<string, string>
  aiQuestions: AiQuestion[]
  currentQuestionIndex: number
  riskLevel: RiskLevel | null
  consultationId: string | null
  // AI Orchestrator fields
  detectedSymptom: string
  bodySystem: string
  aiSpecialization: string
  disease: string
  confidence: number
  dynamicAnswers: string[]
  isEmergency: boolean
  aiAdvice: string
  emergencyMessage: string
}

const initialState: ConsultationState = {
  currentSymptoms: '',
  additionalNotes: '',
  symptomData: initialSymptomQuestionData(),
  aiAnswers: {},
  aiQuestions: [],
  currentQuestionIndex: 0,
  riskLevel: null,
  consultationId: null,
  // AI Orchestrator fields
  detectedSymptom: '',
  bodySystem: '',
  aiSpecialization: '',
  disease: '',
  confidence: 0,
  dynamicAnswers: [],
  isEmergency: false,
  aiAdvice: '',
  emergencyMessage: '',
}

const consultationSlice = createSlice({
  name: 'consultation',
  initialState,
  reducers: {
    setSymptoms: (state, action: PayloadAction<string>) => {
      state.currentSymptoms = action.payload
    },
    setNotes: (state, action: PayloadAction<string>) => {
      state.additionalNotes = action.payload
      state.symptomData.additionalNotes = action.payload
    },
    setSymptomQuestionData: (state, action: PayloadAction<Partial<SymptomQuestionData>>) => {
      state.symptomData = { ...state.symptomData, ...action.payload }
      if (action.payload.additionalNotes !== undefined) {
        state.additionalNotes = action.payload.additionalNotes
      }
    },
    setAnswer: (
      state,
      action: PayloadAction<{
        questionIndex: number
        answer: string
      }>,
    ) => {
      state.aiAnswers[String(action.payload.questionIndex)] = action.payload.answer
    },
    setAiQuestions: (state, action: PayloadAction<AiQuestion[]>) => {
      state.aiQuestions = action.payload
    },
    setCurrentQuestionIndex: (state, action: PayloadAction<number>) => {
      state.currentQuestionIndex = action.payload
    },
    setRiskLevel: (state, action: PayloadAction<RiskLevel | null>) => {
      state.riskLevel = action.payload
    },
    setConsultationId: (state, action: PayloadAction<string | null>) => {
      state.consultationId = action.payload
    },
    setAiAnalysis: (
      state,
      action: PayloadAction<{
        isEmergency?: boolean
        detectedSymptom?: string
        bodySystem?: string
        disease?: string
        aiSpecialization?: string
        riskLevel?: RiskLevel
        confidence?: number
        questions?: AiQuestion[]
        aiAdvice?: string
        emergencyMessage?: string
      }>,
    ) => {
      const p = action.payload
      if (p.isEmergency != null) state.isEmergency = p.isEmergency
      if (p.detectedSymptom != null) state.detectedSymptom = p.detectedSymptom
      if (p.bodySystem != null) state.bodySystem = p.bodySystem
      if (p.disease != null) state.disease = p.disease
      if (p.aiSpecialization != null) state.aiSpecialization = p.aiSpecialization
      if (p.riskLevel != null) state.riskLevel = p.riskLevel
      if (p.confidence != null) state.confidence = p.confidence
      if (p.questions != null) state.aiQuestions = p.questions
      if (p.aiAdvice != null) state.aiAdvice = p.aiAdvice
      if (p.emergencyMessage != null) state.emergencyMessage = p.emergencyMessage
      // Reset dynamic answers when new analysis comes in
      state.dynamicAnswers = []
    },
    setDynamicAnswer: (state, action: PayloadAction<{ index: number; answer: string }>) => {
      const { index, answer } = action.payload
      while (state.dynamicAnswers.length <= index) {
        state.dynamicAnswers.push('')
      }
      state.dynamicAnswers[index] = answer
      const question = state.aiQuestions[index]?.question
      if (question && answer) {
        state.aiAnswers[question] = answer
      }
    },
    syncDynamicQaToAnswers: (state) => {
      state.aiQuestions.forEach((q, index) => {
        const answer = state.dynamicAnswers[index]
        if (q.question && answer) {
          state.aiAnswers[q.question] = answer
        }
      })
    },
    hydrateFromConsultation: (state, action: PayloadAction<Consultation>) => {
      state.currentSymptoms = action.payload.symptoms
      state.additionalNotes = action.payload.additionalNotes ?? ''
      state.aiAnswers = action.payload.aiAnswers ?? {}
      state.symptomData = {
        ...initialSymptomQuestionData(),
        additionalNotes: action.payload.additionalNotes ?? '',
      }
      const a = action.payload.aiAnswers ?? {}
      const fever = a.hasFever as SymptomQuestionData['hasFever'] | undefined
      const temp = a.temperature as SymptomQuestionData['temperature'] | undefined
      const dur = a.feverDuration as SymptomQuestionData['feverDuration'] | undefined
      const chills = a.hasChills as SymptomQuestionData['hasChills'] | undefined
      if (fever === 'yes' || fever === 'no' || fever === 'not_sure') {
        state.symptomData.hasFever = fever
      }
      if (temp === 'normal' || temp === 'low' || temp === 'mild' || temp === 'high' || temp === 'very_high') {
        state.symptomData.temperature = temp
      }
      if (dur === 'today' || dur === '1-2days' || dur === '3-5days' || dur === 'more') {
        state.symptomData.feverDuration = dur
      }
      if (chills === 'yes' || chills === 'no' || chills === 'not_sure') {
        state.symptomData.hasChills = chills
      }
      if (typeof a.moreQuestionsVoiceNotes === 'string') {
        state.symptomData.moreQuestionsVoiceNotes = a.moreQuestionsVoiceNotes
      }
      state.aiQuestions = action.payload.aiSummary?.followUpQuestions ?? []
      state.currentQuestionIndex = 0
      state.riskLevel = action.payload.riskLevel ?? action.payload.aiSummary?.riskLevel ?? null
      state.consultationId = action.payload.id
    },
    resetConsultation: () => initialState,
  },
})

export const {
  hydrateFromConsultation,
  resetConsultation,
  setAiAnalysis,
  setAiQuestions,
  setAnswer,
  setConsultationId,
  setCurrentQuestionIndex,
  setDynamicAnswer,
  syncDynamicQaToAnswers,
  setNotes,
  setRiskLevel,
  setSymptomQuestionData,
  setSymptoms,
} = consultationSlice.actions

export default consultationSlice.reducer
