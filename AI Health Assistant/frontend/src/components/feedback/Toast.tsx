import { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react'

interface ToastItem {
  id: number
  message: string
}

interface ToastContextValue {
  showToast: (message: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export const ToastProvider = ({ children }: PropsWithChildren) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const value = useMemo<ToastContextValue>(
    () => ({
      showToast: (message: string) => {
        const id = Date.now()
        setToasts((current) => [...current, { id, message }])
        window.setTimeout(() => {
          setToasts((current) => current.filter((toast) => toast.id !== id))
        }, 3000)
      },
    }),
    [],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed left-1/2 top-4 z-50 flex w-full max-w-[430px] -translate-x-1/2 flex-col gap-2 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-xl bg-slate-900 px-4 py-3 text-center text-sm text-white shadow-lg"
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within ToastProvider')
  }
  return context
}

const Toast = () => null

export default Toast
