import fs from 'fs'

const p = new URL('../src/pages/_screens.tsx', import.meta.url)
let s = fs.readFileSync(p, 'utf8')

if (!s.includes("from './authFlow'")) {
  s = s.trimEnd() + "\n\nexport {\n  RoleSelectionPage,\n  AuthPage as LoginPage,\n  PatientRegistrationPage,\n  DoctorRegistrationPage,\n  PatientMyProfilePage,\n} from './authFlow'\n"
  fs.writeFileSync(p, s)
  console.log('exports added')
} else {
  console.log('exports already present')
}
