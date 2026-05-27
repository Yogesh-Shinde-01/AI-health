import fs from 'fs'

const p = new URL('../src/pages/authFlow.tsx', import.meta.url)
const d = ['d', 'i', 'v'].join('')
const file = fs.readFileSync(p, 'utf8')

const rest = `
export const AuthPage = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const { showToast } = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const userRole = useOnboardingStore((s) => s.userRole)
  const draft = readRegisterDraft()
  const [tab, setTab] = useState<'login' | 'register'>(
    searchParams.get('tab') === 'register' ? 'register' : 'login',
  )
  const [loading, setLoading] = useState(false)
  const isDoctor = userRole === 'doctor'

  useEffect(() => {
    dispatch(setRole(isDoctor ? 'DOCTOR' : 'PATIENT'))
  }, [dispatch, isDoctor])

  useEffect(() => {
    if (searchParams.get('tab') === 'register') {
      setTab('register')
    }
  }, [searchParams])

  const switchTab = (next: 'login' | 'register') => {
    setTab(next)
    if (next === 'register') {
      setSearchParams({ tab: 'register' })
    } else {
      setSearchParams({})
    }
  }

  const loginForm = useForm<{ mobile: string }>({
    resolver: zodResolver(loginSchema),
    defaultValues: { mobile: draft.mobile?.replace(/^\\+91/, '') ?? '' },
  })

  const patientRegForm = useForm<{ fullName: string; mobile: string; email: string }>({
    resolver: zodResolver(patientRegisterSchema),
    defaultValues: {
      fullName: draft.fullName ?? '',
      mobile: draft.mobile?.replace(/^\\+91/, '') ?? '',
      email: draft.email ?? '',
    },
  })

  const doctorRegForm = useForm<{
    fullName: string
    mobile: string
    email: string
    specialization: string
    registrationNumber: string
  }>({
    resolver: zodResolver(doctorRegisterSchema),
    defaultValues: {
      fullName: draft.fullName ?? '',
      mobile: draft.mobile?.replace(/^\\+91/, '') ?? '',
      email: draft.email ?? '',
      specialization: draft.specialization ?? 'General Physician',
      registrationNumber: draft.registrationNumber ?? '',
    },
  })

  const sendOtpAndNavigate = async (mobile: string, draftData?: RegisterDraft) => {
    setLoading(true)
    try {
      if (draftData) {
        writeRegisterDraft(draftData)
      }
      await sendOtp(\`+91\${mobile}\`, userRole)
      window.sessionStorage.setItem(storageKeys.lastMobile, \`+91\${mobile}\`)
      navigate('/otp')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout hideNav>
      <${d} className="page-padding flex min-h-screen flex-col bg-background">
        <AuthFlowHeader
          title={tab === 'login' ? t('login.title') : t('login.createTitle')}
          subtitle={tab === 'login' ? t('login.subtitle') : t('login.createSubtitle')}
          onBack={() => navigate('/role-selection')}
          right={<RoleBadge role={userRole} />}
        />

        <${d} className="mb-6 flex rounded-app border border-border bg-slate-50 p-1">
          <button
            type="button"
            className={classNames('flex-1 rounded-app py-2 text-sm font-semibold', tab === 'login' ? 'bg-white shadow-card' : 'text-muted')}
            onClick={() => switchTab('login')}
          >
            {t('auth.tabLogin')}
          </button>
          <button
            type="button"
            className={classNames('flex-1 rounded-app py-2 text-sm font-semibold', tab === 'register' ? 'bg-white shadow-card' : 'text-muted')}
            onClick={() => switchTab('register')}
          >
            {t('auth.tabRegister')}
          </button>
        </${d}>

        {tab === 'login' ? (
          <form
            className="flex flex-1 flex-col"
            onSubmit={loginForm.handleSubmit(async (values) => sendOtpAndNavigate(values.mobile))}
          >
            <${d} className="flex-1 space-y-4">
              <${d}>
                <label className="mb-2 block text-sm font-medium text-muted">{t('login.mobilePlaceholder')}</label>
                <input
                  {...loginForm.register('mobile')}
                  maxLength={10}
                  className="input"
                  inputMode="numeric"
                  placeholder={t('login.mobileFieldPlaceholder')}
                />
                {loginForm.formState.errors.mobile ? (
                  <p className="mt-2 text-sm text-danger">{t('login.invalidMobile')}</p>
                ) : null}
              </${d}>
              <button type="button" className="text-sm font-medium text-primary" onClick={() => showToast(t('auth.forgotPasswordSoon'))}>
                {t('auth.forgotPassword')}
              </button>
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <LoadingSpinner size={20} /> : t('login.sendOtp')}
              </button>
              <SocialButtons showToast={showToast} t={t} />
            </${d}>
            <${d} className="mt-auto border-t border-border pt-6 text-center text-sm">
              <span className="text-muted">{t('login.newUser')} </span>
              <button type="button" className="font-semibold text-primary" onClick={() => switchTab('register')}>
                {t('login.registerNow')}
              </button>
            </${d}>
          </form>
        ) : (
          <form
            className="flex flex-1 flex-col"
            onSubmit={
              isDoctor
                ? doctorRegForm.handleSubmit(async (values) =>
                    sendOtpAndNavigate(values.mobile, {
                      fullName: values.fullName,
                      mobile: \`+91\${values.mobile}\`,
                      email: values.email,
                      specialization: values.specialization,
                      registrationNumber: values.registrationNumber,
                    }),
                  )
                : patientRegForm.handleSubmit(async (values) =>
                    sendOtpAndNavigate(values.mobile, {
                      fullName: values.fullName,
                      mobile: \`+91\${values.mobile}\`,
                      email: values.email,
                    }),
                  )
            }
          >
            <${d} className="flex-1 space-y-4">
              {isDoctor ? (
                <>
                  <input {...doctorRegForm.register('fullName')} className="input" placeholder={t('doctorReg.fullName')} />
                  <input
                    {...doctorRegForm.register('mobile')}
                    maxLength={10}
                    className="input"
                    inputMode="numeric"
                    placeholder={t('register.mobile')}
                  />
                  <input {...doctorRegForm.register('email')} className="input" type="email" placeholder={t('register.email')} />
                  <select {...doctorRegForm.register('specialization')} className="input">
                    {['General Physician', 'Cardiologist', 'Pediatrician', 'Dermatologist', 'Orthopedic', 'ENT', 'Other'].map(
                      (option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ),
                    )}
                  </select>
                  <input
                    {...doctorRegForm.register('registrationNumber')}
                    className="input"
                    placeholder={t('doctorReg.registrationNumber')}
                  />
                </>
              ) : (
                <>
                  <input {...patientRegForm.register('fullName')} className="input" placeholder={t('register.fullName')} />
                  <input
                    {...patientRegForm.register('mobile')}
                    maxLength={10}
                    className="input"
                    inputMode="numeric"
                    placeholder={t('register.mobile')}
                  />
                  <input {...patientRegForm.register('email')} className="input" type="email" placeholder={t('register.email')} />
                </>
              )}
              <button type="submit" className="btn-primary" disabled={loading}>
                {loading ? <LoadingSpinner size={20} /> : t('register.submit')}
              </button>
              <SocialButtons showToast={showToast} t={t} />
            </${d}>
            <${d} className="mt-auto border-t border-border pt-6 text-center text-sm">
              <span className="text-muted">{t('login.existingUser')} </span>
              <button type="button" className="font-semibold text-primary" onClick={() => switchTab('login')}>
                {t('login.loginNow')}
              </button>
            </${d}>
          </form>
        )}
      </${d}>
    </Layout>
  )
}

function SocialButtons({ showToast, t }: { showToast: (msg: string) => void; t: (key: string) => string }) {
  return (
    <>
      <${d} className="flex items-center gap-3 text-sm text-muted">
        <span className="h-px flex-1 bg-border" />
        <span>{t('login.continueWith')}</span>
        <span className="h-px flex-1 bg-border" />
      </${d}>
      <${d} className="flex gap-3">
        <button
          type="button"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-app border border-border bg-white font-medium shadow-card"
          onClick={() => showToast(t('login.socialSoon'))}
        >
          <span className="text-lg font-bold text-[#EA4335]">G</span>
          <span className="hidden sm:inline">{t('login.google')}</span>
        </button>
        <button
          type="button"
          className="flex h-11 flex-1 items-center justify-center gap-2 rounded-app border border-border bg-white font-medium shadow-card"
          onClick={() => showToast(t('login.socialSoon'))}
        >
          <Apple size={18} className="text-foreground" />
          <span className="hidden sm:inline">{t('login.apple')}</span>
        </button>
      </${d}>
    </>
  )
}
`

const out = file.replace('const PLACEHOLDER_AUTH_PAGE = 1', rest.trim())
fs.writeFileSync(p, out)
console.log('Appended AuthPage')
