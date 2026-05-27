import fs from 'fs'

const p = new URL('../src/pages/authFlow.tsx', import.meta.url)
const d = ['d', 'i', 'v'].join('')

const rest = `
export const PatientRegistrationPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [showSuccess, setShowSuccess] = useState(false)
  const draft = readRegisterDraft()
  const mobile =
    typeof window !== 'undefined' ? window.sessionStorage.getItem(storageKeys.lastMobile) ?? draft.mobile ?? '' : ''

  if (!isOtpVerified()) {
    return <Navigate to="/auth" replace />
  }

  const profileForm = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: draft.fullName ?? '',
      age: undefined as number | undefined,
      gender: '' as '' | Gender,
      heightCm: undefined as number | undefined,
      weightKg: undefined as number | undefined,
      bloodGroup: '' as '' | BloodGroup,
    },
  })

  const extendedForm = useForm({
    resolver: zodResolver(extendedProfileSchema),
    defaultValues: {
      email: draft.email ?? '',
      dateOfBirth: '',
      address: '',
      emergencyContact: '',
    },
  })

  const finishRegistration = async () => {
    setLoading(true)
    try {
      const profileValues = profileForm.getValues()
      const extendedValues = extendedForm.getValues()
      const nextProfile = await updateProfile({
        ...profileValues,
        gender: profileValues.gender as Gender,
        bloodGroup: profileValues.bloodGroup as BloodGroup,
      })
      dispatch(setProfile(nextProfile))
      writePatientExtendedProfile(extendedValues as PatientExtendedProfile)
      if (mobile) {
        registerMobile(mobile, 'patient')
      }
      setOtpVerified(false)
      window.sessionStorage.removeItem(storageKeys.registerDraft)
      dispatch(logout())
      setShowSuccess(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout hideNav>
      <${d} className="page-padding min-h-screen bg-background pb-8">
        <AuthFlowHeader
          title={t('patientReg.title')}
          subtitle={step === 1 ? t('patientReg.step1Subtitle') : t('patientReg.step2Subtitle')}
          onBack={() => (step === 1 ? navigate('/auth') : setStep(1))}
          right={<RoleBadge role="patient" />}
        />
        <${d} className="mb-4 text-sm text-muted">{t('patientReg.step', { current: step, total: 2 })}</${d}>

        {step === 1 ? (
          <form
            className="space-y-4"
            onSubmit={profileForm.handleSubmit(() => setStep(2))}
          >
            <input {...profileForm.register('fullName')} className="input" placeholder={t('profile.fullName')} />
            <${d} className="flex gap-2.5">
              <input {...profileForm.register('age')} type="number" className="input flex-1" placeholder={t('profile.age')} />
              <select {...profileForm.register('gender')} className="input flex-1" defaultValue="">
                <option value="" disabled>{t('profile.selectGender')}</option>
                <option value="MALE">{t('profile.male')}</option>
                <option value="FEMALE">{t('profile.female')}</option>
                <option value="OTHER">{t('profile.other')}</option>
              </select>
            </${d}>
            <${d} className="flex gap-2.5">
              <input {...profileForm.register('heightCm')} type="number" className="input flex-1" placeholder={t('profile.height')} />
              <input {...profileForm.register('weightKg')} type="number" className="input flex-1" placeholder={t('profile.weight')} />
            </${d}>
            <select {...profileForm.register('bloodGroup')} className="input" defaultValue="">
              <option value="" disabled>{t('profile.bloodGroupPlaceholder')}</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                <option key={bg} value={bg}>{bg}</option>
              ))}
            </select>
            <button type="submit" className="btn-primary">{t('common.next')}</button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={extendedForm.handleSubmit(() => void finishRegistration())}>
            <input {...extendedForm.register('email')} className="input" type="email" placeholder={t('patientReg.email')} />
            <input {...extendedForm.register('dateOfBirth')} className="input" type="date" placeholder={t('patientReg.dob')} />
            <input {...extendedForm.register('address')} className="input" placeholder={t('patientReg.address')} />
            <input {...extendedForm.register('emergencyContact')} className="input" placeholder={t('patientReg.emergency')} />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <LoadingSpinner size={20} /> : t('patientReg.finish')}
            </button>
          </form>
        )}

        <RegistrationSuccessModal
          open={showSuccess}
          onGoToLogin={() => {
            setShowSuccess(false)
            navigate('/auth')
          }}
        />
      </${d}>
    </Layout>
  )
}

export const DoctorRegistrationPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const draft = readRegisterDraft()
  const existing = readDoctorProfile()
  const mobile =
    typeof window !== 'undefined' ? window.sessionStorage.getItem(storageKeys.lastMobile) ?? draft.mobile ?? '' : ''

  if (!isOtpVerified()) {
    return <Navigate to="/auth" replace />
  }

  const step1Form = useForm({
    resolver: zodResolver(doctorStep1Schema),
    defaultValues: {
      fullName: existing?.fullName ?? draft.fullName ?? '',
      specialization: existing?.specialization ?? draft.specialization ?? 'General Physician',
      registrationNumber: existing?.registrationNumber ?? draft.registrationNumber ?? '',
      hospital: existing?.hospital ?? draft.hospital ?? '',
    },
  })

  const step2Form = useForm({
    resolver: zodResolver(doctorStep2Schema),
    defaultValues: {
      experienceYears: existing?.experienceYears ?? '',
      consultationFee: existing?.consultationFee ?? '',
      email: existing?.email ?? draft.email ?? '',
      clinicAddress: existing?.clinicAddress ?? '',
    },
  })

  const finishDoctor = async () => {
    setLoading(true)
    try {
      const step1 = step1Form.getValues()
      const step2 = step2Form.getValues()
      const profile: DoctorProfileRecord = { ...step1, ...step2 }
      writeDoctorProfile(profile)
      setDocProfileComplete()
      if (mobile) {
        registerMobile(mobile, 'doctor')
      }
      setOtpVerified(false)
      window.sessionStorage.removeItem(storageKeys.registerDraft)
      dispatch(
        setCredentials({
          user: { id: 'doctor-1', mobile, role: roleToUserRole('doctor') },
          token: 'mock-token-doctor',
        }),
      )
      navigate('/doctor-dashboard', { replace: true })
    } finally {
      setLoading(false)
    }
  }

  const specializationChoices = [
    'General Physician',
    'Cardiologist',
    'Pediatrician',
    'Dermatologist',
    'Orthopedic',
    'ENT',
    'Other',
  ]

  return (
    <Layout hideNav>
      <${d} className="page-padding min-h-screen space-y-5 bg-background pb-8">
        <AuthFlowHeader
          title={t('doctorReg.title')}
          subtitle={step === 1 ? t('doctorReg.step1Subtitle') : t('doctorReg.step2Subtitle')}
          onBack={() => (step === 1 ? navigate('/auth') : setStep(1))}
          right={<RoleBadge role="doctor" />}
        />
        <${d} className="mb-2 text-sm text-muted">{t('doctorReg.step', { current: step, total: 2 })}</${d}>

        {step === 1 ? (
          <form className="space-y-4" onSubmit={step1Form.handleSubmit(() => setStep(2))}>
            <input {...step1Form.register('fullName')} className="input" placeholder={t('doctorProfileSetup.fullNamePh')} />
            <select {...step1Form.register('specialization')} className="input">
              {specializationChoices.map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <input {...step1Form.register('registrationNumber')} className="input" placeholder={t('doctorProfileSetup.regPh')} />
            <input {...step1Form.register('hospital')} className="input" placeholder={t('doctorProfileSetup.hospitalPh')} />
            <button type="submit" className="btn-primary">{t('common.next')}</button>
          </form>
        ) : (
          <form className="space-y-4" onSubmit={step2Form.handleSubmit(() => void finishDoctor())}>
            <input {...step2Form.register('experienceYears')} className="input" inputMode="numeric" placeholder={t('doctorProfileSetup.experiencePh')} />
            <input {...step2Form.register('consultationFee')} className="input" placeholder={t('doctorProfileSetup.feePh')} />
            <input {...step2Form.register('email')} className="input" type="email" placeholder={t('doctorProfile.emailPh')} />
            <input {...step2Form.register('clinicAddress')} className="input" placeholder={t('doctorReg.clinicAddress')} />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <LoadingSpinner size={20} /> : t('doctorReg.finish')}
            </button>
          </form>
        )}
      </${d}>
    </Layout>
  )
}

export const PatientMyProfilePage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const profile = useAppSelector((state) => state.patient.profile)
  const extended = readPatientExtendedProfile()
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const { showToast } = useToast()

  const form = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      fullName: profile?.fullName ?? '',
      age: profile?.age ?? undefined,
      gender: (profile?.gender ?? '') as '' | Gender,
      heightCm: profile?.heightCm ?? undefined,
      weightKg: profile?.weightKg ?? undefined,
      bloodGroup: (profile?.bloodGroup ?? '') as '' | BloodGroup,
    },
  })

  const extendedForm = useForm({
    defaultValues: {
      email: extended?.email ?? '',
      dateOfBirth: extended?.dateOfBirth ?? '',
      address: extended?.address ?? '',
      emergencyContact: extended?.emergencyContact ?? '',
    },
  })

  const saveProfile = async () => {
    setLoading(true)
    try {
      const values = form.getValues()
      const ext = extendedForm.getValues()
      const nextProfile = await updateProfile({
        ...values,
        gender: values.gender as Gender,
        bloodGroup: values.bloodGroup as BloodGroup,
      })
      dispatch(setProfile(nextProfile))
      writePatientExtendedProfile(ext)
      showToast(t('toast.profileUpdated'))
      setEditing(false)
    } finally {
      setLoading(false)
    }
  }

  const InfoRow = ({ label, value }: { label: string; value?: string | number }) => (
    <${d} className="flex justify-between gap-4 border-b border-border py-3 last:border-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-medium text-foreground">{value ?? t('common.none')}</span>
    </${d}>
  )

  return (
    <Layout>
      <${d} className="page-padding bg-background pb-8">
        <AuthFlowHeader
          title={t('myProfile.title')}
          subtitle={t('myProfile.subtitle')}
          onBack={() => navigate('/home')}
          right={
            <button
              type="button"
              className="rounded-full border border-border p-2 text-primary"
              onClick={() => setEditing((e) => !e)}
              aria-label={t('myProfile.edit')}
            >
              <Pencil size={18} />
            </button>
          }
        />

        {editing ? (
          <form className="space-y-4" onSubmit={form.handleSubmit(() => void saveProfile())}>
            <input {...form.register('fullName')} className="input" />
            <${d} className="flex gap-2">
              <input {...form.register('age')} type="number" className="input flex-1" />
              <select {...form.register('gender')} className="input flex-1">
                <option value="MALE">{t('profile.male')}</option>
                <option value="FEMALE">{t('profile.female')}</option>
                <option value="OTHER">{t('profile.other')}</option>
              </select>
            </${d}>
            <input {...extendedForm.register('email')} className="input" placeholder={t('patientReg.email')} />
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? <LoadingSpinner size={20} /> : t('common.save')}
            </button>
          </form>
        ) : (
          <>
            <${d} className="card mb-4 p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t('myProfile.basicSection')}</p>
              <InfoRow label={t('profile.fullName')} value={profile?.fullName} />
              <InfoRow label={t('profile.age')} value={profile?.age} />
              <InfoRow label={t('profile.gender')} value={profile?.gender} />
              <InfoRow label={t('profile.height')} value={profile?.heightCm ? \`\${profile.heightCm} cm\` : undefined} />
              <InfoRow label={t('profile.weight')} value={profile?.weightKg ? \`\${profile.weightKg} kg\` : undefined} />
              <InfoRow label={t('profile.bloodGroup')} value={profile?.bloodGroup} />
            </${d}>
            <${d} className="card p-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">{t('myProfile.contactSection')}</p>
              <InfoRow label={t('patientReg.email')} value={extended?.email} />
              <InfoRow label={t('patientReg.dob')} value={extended?.dateOfBirth} />
              <InfoRow label={t('patientReg.address')} value={extended?.address} />
              <InfoRow label={t('patientReg.emergency')} value={extended?.emergencyContact} />
            </${d}>
          </>
        )}

        <button
          type="button"
          className="btn-secondary mt-6 flex w-full items-center justify-center gap-2"
          onClick={() => {
            dispatch(logout())
            navigate('/welcome')
          }}
        >
          <LogOut size={18} />
          {t('myProfile.logout')}
        </button>
      </${d}>
    </Layout>
  )
}
`

fs.appendFileSync(p, rest)
console.log('Appended registration and profile pages')
