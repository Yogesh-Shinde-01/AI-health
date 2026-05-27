const fs = require('fs')
const path = 'c:/Users/PC/AI Health Assistant/frontend/src/pages/auth/authFlow.tsx'
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/)

const start = lines.findIndex((l) => l.includes('mb-6 flex rounded-app border border-border bg-slate-50'))
const end = lines.findIndex((l, i) => i > start && l.trim() === ')}' && lines[i - 1]?.trim() === '</form>')

if (start < 0 || end < 0) {
  console.error('markers not found', { start, end })
  process.exit(1)
}

const block = `        <div className="mb-6 flex rounded-app border border-border bg-slate-50 p-1">
          {tab === 'login' ? (
            <button
              type="button"
              className={classNames('flex-1 rounded-app py-2 text-sm font-semibold', tab === 'login' ? 'bg-white shadow-card' : 'text-muted')}
              onClick={() => switchTab('login')}
            >
              {t('auth.tabLogin')}
            </button>
          ) : null}
          {tab === 'register' ? (
            <button
              type="button"
              className={classNames('flex-1 rounded-app py-2 text-sm font-semibold', tab === 'register' ? 'bg-white shadow-card' : 'text-muted')}
              onClick={() => switchTab('register')}
            >
              {t('auth.tabRegister')}
            </button>
          ) : null}
        </div>

        {tab === 'login' ? (
          <div className="flex flex-1 flex-col">
            <motionless className="flex-1 space-y-4">
              {isDoctor ? <DoctorLoginForm /> : <PatientLoginForm />}
            </motionless>
            <div className="mt-auto border-t border-border pt-6 text-center text-sm">
              <span className="text-muted">{t('login.newUser')} </span>
              <button type="button" className="font-semibold text-primary" onClick={() => switchTab('register')}>
                {t('login.registerNow')}
              </button>
            </div>
          </div>
        ) : (
`.split('\n').map((l) => l.replace(/motionless/g, 'motionless').replace(/<motionless/g, '<div').replace(/<\/motionless/g, '</motionless'))

// fix motionless typos in block
const fixedBlock = block.map((l) => l.replace('motionless', 'DIV_PLACEHOLDER')).map((l) => l.replace(/DIV_PLACEHOLDER/g, (m, offset, str) => {
  if (l.includes('</DIV_PLACEHOLDER>')) return l.replace('</DIV_PLACEHOLDER>', '</div>')
  if (l.includes('<DIV_PLACEHOLDER')) return l.replace('<DIV_PLACEHOLDER', '<div')
  return l
}))

// Simpler: write block without typos
const cleanBlock = [
  "        <div className=\"mb-6 flex rounded-app border border-border bg-slate-50 p-1\">",
  "          {tab === 'login' ? (",
  '            <button',
  '              type="button"',
  "              className={classNames('flex-1 rounded-app py-2 text-sm font-semibold', tab === 'login' ? 'bg-white shadow-card' : 'text-muted')}",
  "              onClick={() => switchTab('login')}",
  '            >',
  "              {t('auth.tabLogin')}",
  '            </button>',
  '          ) : null}',
  "          {tab === 'register' ? (",
  '            <button',
  '              type="button"',
  "              className={classNames('flex-1 rounded-app py-2 text-sm font-semibold', tab === 'register' ? 'bg-white shadow-card' : 'text-muted')}",
  "              onClick={() => switchTab('register')}",
  '            >',
  "              {t('auth.tabRegister')}",
  '            </button>',
  '          ) : null}',
  '        </div>',
  '',
  "        {tab === 'login' ? (",
  '          <div className="flex flex-1 flex-col">',
  '            <div className="flex-1 space-y-4">',
  '              {isDoctor ? <DoctorLoginForm /> : <PatientLoginForm />}',
  '            </div>',
  '            <motionless className="mt-auto border-t border-border pt-6 text-center text-sm">',
].join('\n')

// I keep making typos - write cleanBlock properly in one array
const tabAndLogin = [
  '        <div className="mb-6 flex rounded-app border border-border bg-slate-50 p-1">',
  "          {tab === 'login' ? (",
  '            <button',
  '              type="button"',
  "              className={classNames('flex-1 rounded-app py-2 text-sm font-semibold', tab === 'login' ? 'bg-white shadow-card' : 'text-muted')}",
  "              onClick={() => switchTab('login')}",
  '            >',
  "              {t('auth.tabLogin')}",
  '            </button>',
  '          ) : null}',
  "          {tab === 'register' ? (",
  '            <button',
  '              type="button"',
  "              className={classNames('flex-1 rounded-app py-2 text-sm font-semibold', tab === 'register' ? 'bg-white shadow-card' : 'text-muted')}",
  "              onClick={() => switchTab('register')}",
  '            >',
  "              {t('auth.tabRegister')}",
  '            </button>',
  '          ) : null}',
  '        </motionless>',
  '',
  "        {tab === 'login' ? (",
  '          <div className="flex flex-1 flex-col">',
  '            <div className="flex-1 space-y-4">',
  '              {isDoctor ? <DoctorLoginForm /> : <PatientLoginForm />}',
  '            </motionless>',
  '            <div className="mt-auto border-t border-border pt-6 text-center text-sm">',
  '              <span className="text-muted">{t(\'login.newUser\')} </span>',
  '              <button type="button" className="font-semibold text-primary" onClick={() => switchTab(\'register\')}>',
  '                {t(\'login.registerNow\')}',
  '              </button>',
  '            </motionless>',
  '          </motionless>',
  '        ) : (',
].map((l) => l.replace(/motionless/g, 'div'))

const registerLines = lines.slice(start + 1, end)
// registerLines currently starts with login branch - find where form starts
const formStart = registerLines.findIndex((l) => l.trim().startsWith('<form'))
const formLines = registerLines.slice(formStart)

const next = [
  ...lines.slice(0, start),
  ...tabAndLogin,
  ...formLines,
  '        )}',
  '      </div>',
  ...lines.slice(end + 1),
]

fs.writeFileSync(path, next.join('\n'))
console.log('Fixed auth tabs', { start: start + 1, end: end + 1, formStart })
