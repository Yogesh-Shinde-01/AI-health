import client from '@/services/apiClient'
import type { AiQuestion, RiskLevel } from '@/types'

export interface AiAnalysisResult {
  isEmergency: boolean
  detectedSymptom: string
  bodySystem: string
  disease: string
  specialization: string
  riskLevel: RiskLevel
  confidence: number
  questions: AiQuestion[]
  advice: string
  emergencyMessage?: string
  source: 'emergency' | 'dataset' | 'groq' | 'none'
}

export interface FinalAnalysisResult {
  disease: string
  confidence: number
  specialization: string
  riskLevel: RiskLevel
  advice: string
  source: string
}

export const analyzeSymptoms = async (symptoms: string): Promise<AiAnalysisResult> => {
  const response = await client.post<{ success: boolean; data: AiAnalysisResult }>(
    '/ai/analyze-symptoms',
    { symptoms },
  )
  return response.data.data
}

export const runFinalAnalysis = async (
  symptoms: string,
  answers: Record<string, string>,
  additionalNotes?: string,
): Promise<FinalAnalysisResult> => {
  const response = await client.post<{ success: boolean; data: FinalAnalysisResult }>(
    '/ai/final-analysis',
    { symptoms, answers, additionalNotes },
  )
  return response.data.data
}

export interface AiQaPair {
  question: string
  answer: string
}

export interface NextQuestionResult {
  done: boolean
  question?: AiQuestion
  rationale?: string
}

export const fetchNextQuestion = async (
  symptoms: string,
  history: AiQaPair[],
  additionalNotes?: string,
): Promise<NextQuestionResult> => {
  const response = await client.post<{ success: boolean; data: NextQuestionResult }>(
    '/ai/next-question',
    { symptoms, history, additionalNotes },
  )
  return response.data.data
}
