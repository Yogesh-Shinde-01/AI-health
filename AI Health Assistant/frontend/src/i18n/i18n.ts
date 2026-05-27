import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import hi from './locales/hi.json'
import mr from './locales/mr.json'

const storedLanguage =
  typeof window !== 'undefined' ? window.localStorage.getItem('ai-health-language') ?? 'mr' : 'mr'

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      hi: { translation: hi },
      mr: { translation: mr },
    },
    lng: storedLanguage,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false,
    },
  })
}

export const syncI18nLanguage = (language: string): void => {
  if (i18n.language !== language) {
    void i18n.changeLanguage(language)
  }
}

export default i18n
