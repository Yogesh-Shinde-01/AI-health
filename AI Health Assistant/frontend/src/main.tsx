import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { Provider } from 'react-redux'
import '@/assets/styles/index.css'
import App from '@/App'
import LoadingSpinner from '@/components/feedback/LoadingSpinner'
import { ToastProvider } from '@/components/feedback/Toast'
import '@/i18n/i18n'
import { syncI18nLanguage } from '@/i18n/i18n'
import { store } from '@/store'
import { AuthProvider } from '@/context/AuthContext'
import { LanguageProvider } from '@/context/LanguageContext'
import { ThemeProvider } from '@/context/ThemeContext'

syncI18nLanguage(store.getState().language.selectedLanguage)
store.subscribe(() => {
  syncI18nLanguage(store.getState().language.selectedLanguage)
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <AuthProvider>
        <LanguageProvider>
          <ThemeProvider>
            <Suspense fallback={<LoadingSpinner className="min-h-screen" />}>
              <ToastProvider>
                <App />
              </ToastProvider>
            </Suspense>
          </ThemeProvider>
        </LanguageProvider>
      </AuthProvider>
    </Provider>
  </StrictMode>,
)
