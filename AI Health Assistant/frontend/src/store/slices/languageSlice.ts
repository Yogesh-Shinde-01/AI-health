import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import { getInitialLanguage, storageKeys } from '@/utils'

interface LanguageState {
  selectedLanguage: string
}

const initialState: LanguageState = {
  selectedLanguage: getInitialLanguage(),
}

const languageSlice = createSlice({
  name: 'language',
  initialState,
  reducers: {
    setLanguage: (state, action: PayloadAction<string>) => {
      state.selectedLanguage = action.payload
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(storageKeys.language, action.payload)
      }
    },
  },
})

export const { setLanguage } = languageSlice.actions
export default languageSlice.reducer
