import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { MedicalHistory, Patient } from '@/types'
import { readStorage, storageKeys, writeStorage } from '@/utils'

interface PatientState {
  profile: Patient | null
  medicalHistory: MedicalHistory | null
}

const initialState: PatientState = {
  profile: readStorage<Patient | null>(storageKeys.profile, null),
  medicalHistory: readStorage<MedicalHistory | null>(storageKeys.medicalHistory, null),
}

const patientSlice = createSlice({
  name: 'patient',
  initialState,
  reducers: {
    setProfile: (state, action: PayloadAction<Patient>) => {
      state.profile = action.payload
      writeStorage(storageKeys.profile, action.payload)
    },
    setMedicalHistory: (state, action: PayloadAction<MedicalHistory>) => {
      state.medicalHistory = action.payload
      writeStorage(storageKeys.medicalHistory, action.payload)
    },
  },
})

export const { setProfile, setMedicalHistory } = patientSlice.actions
export default patientSlice.reducer
