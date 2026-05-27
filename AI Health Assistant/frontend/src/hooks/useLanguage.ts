import i18n from '@/i18n/i18n'
import { useAppDispatch, useAppSelector } from '@/store'
import { setLanguage as setLanguageAction } from '@/store/slices/languageSlice'

export const useLanguage = () => {
  const dispatch = useAppDispatch()
  const selectedLanguage = useAppSelector((state) => state.language.selectedLanguage)

  const setLanguage = (code: string) => {
    dispatch(setLanguageAction(code))
    void i18n.changeLanguage(code)
  }

  return { selectedLanguage, setLanguage }
}
