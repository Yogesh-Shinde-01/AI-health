const fs = require('fs')
const path = 'c:/Users/PC/AI Health Assistant/frontend/src/pages/auth/authFlow.tsx'
const lines = fs.readFileSync(path, 'utf8').split(/\r?\n/)
const start = lines.findIndex((l) => /^\s+\{tab === 'login' \? \($/.test(l))
let endIdx = -1
for (let i = start + 1; i < lines.length; i++) {
  if (lines[i].trim() === '</form>' && lines[i + 1]?.trim() === ') : (') {
    endIdx = i
    break
  }
}
if (start < 0 || endIdx < 0) {
  console.error('Could not find login block', { start, endIdx })
  process.exit(1)
}
const replacement = [
  "        {tab === 'login' ? (",
  '          <div className="flex flex-1 flex-col">',
  '            <div className="flex-1 space-y-4">',
  '              {isDoctor ? <DoctorLoginForm /> : <PatientLoginForm />}',
  '            </div>',
  '            <div className="mt-auto border-t border-border pt-6 text-center text-sm">',
  "              <span className=\"text-muted\">{t('login.newUser')} </span>",
  "              <button type=\"button\" className=\"font-semibold text-primary\" onClick={() => switchTab('register')}>",
  "                {t('login.registerNow')}",
  '              </button>',
  '            </div>',
  '          </motionless>',
  '        ) : (',
]
// fix accidental motionless
const fixed = replacement.map((l) => l.replace('</motionless>', '</div>'))
const next = [...lines.slice(0, start), ...fixed, ...lines.slice(endIdx + 2)]
fs.writeFileSync(path, next.join('\n'))
console.log(`Replaced lines ${start + 1}-${endIdx + 1}`)
