import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppSelector } from '@/store'

interface SpeechRecognitionAlternative {
  transcript: string
}

interface SpeechRecognitionResultLike {
  0: SpeechRecognitionAlternative
  isFinal: boolean
  length: number
}

interface SpeechRecognitionEventLike {
  results: ArrayLike<SpeechRecognitionResultLike>
}

interface SpeechRecognitionErrorEventLike {
  error: string
}

interface SpeechRecognitionLike {
  continuous: boolean
  interimResults: boolean
  lang: string
  onresult: ((event: SpeechRecognitionEventLike) => void) | null
  onerror: ((event: SpeechRecognitionErrorEventLike) => void) | null
  onstart: (() => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionLike
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor
    webkitSpeechRecognition?: SpeechRecognitionConstructor
  }
}

export interface VoiceInputResult {
  transcript: string
  isListening: boolean
  startListening: () => void
  stopListening: () => void
  isSupported: boolean
  error: string | null
}

const languageMap: Record<string, string> = {
  mr: 'mr-IN',
  hi: 'hi-IN',
  en: 'en-US',
}

export const useVoiceInput = (): VoiceInputResult => {
  const selectedLanguage = useAppSelector((state) => state.language.selectedLanguage)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const Recognition = useMemo(
    () => (typeof window !== 'undefined' ? window.SpeechRecognition ?? window.webkitSpeechRecognition : undefined),
    [],
  )

  useEffect(() => {
    if (!Recognition) {
      setError('Voice input not supported in this browser')
      return
    }

    const recognition = new Recognition()
    recognition.continuous = false
    recognition.interimResults = true
    recognition.lang = languageMap[selectedLanguage] ?? 'en-US'
    recognition.onstart = () => {
      setIsListening(true)
      setError(null)
    }
    recognition.onend = () => {
      setIsListening(false)
    }
    recognition.onerror = (event) => {
      setIsListening(false)
      setError(event.error)
    }
    recognition.onresult = (event) => {
      let nextTranscript = ''
      for (let index = 0; index < event.results.length; index += 1) {
        const result = event.results[index]
        nextTranscript += result[0].transcript
      }
      setTranscript(nextTranscript.trim())
    }

    recognitionRef.current = recognition

    return () => {
      recognition.stop()
    }
  }, [Recognition, selectedLanguage])

  const startListening = () => {
    if (!recognitionRef.current) {
      setError('Voice input not supported in this browser')
      return
    }
    setTranscript('')
    recognitionRef.current.start()
  }

  const stopListening = () => {
    recognitionRef.current?.stop()
  }

  return {
    transcript,
    isListening,
    startListening,
    stopListening,
    isSupported: Boolean(Recognition),
    error: Recognition ? error : 'Voice input not supported in this browser',
  }
}
