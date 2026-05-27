import { configureStore } from '@reduxjs/toolkit'
import { useDispatch, useSelector, type TypedUseSelectorHook } from 'react-redux'
import authReducer from '@/store/slices/authSlice'
import consultationReducer from '@/store/slices/consultationSlice'
import languageReducer from '@/store/slices/languageSlice'
import patientReducer from '@/store/slices/patientSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    patient: patientReducer,
    consultation: consultationReducer,
    language: languageReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch

export const useAppDispatch = (): AppDispatch => useDispatch<AppDispatch>()
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector
