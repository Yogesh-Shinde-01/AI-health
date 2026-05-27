import fs from 'fs'

const p = new URL('../src/pages/_screens.tsx', import.meta.url)
const d = ['d', 'i', 'v'].join('')
let s = fs.readFileSync(p, 'utf8')

const oldBlock = `  return (
    <Layout>
      <${d} className="page-padding space-y-6 bg-background">
        <${d}>
          <h1 className="text-3xl font-bold text-foreground">
            {t('home.greeting', { name: profile?.fullName ?? 'User' })}
          </h1>
          <p className="mt-2 text-muted">{t('home.subtitle')}</p>
        </${d}>

        <${d} className="flex flex-col items-center py-2">`

const newBlock = `  const firstName = profile?.fullName?.split(' ')[0] ?? 'User'

  return (
    <Layout>
      <${d} className="page-padding space-y-6 bg-background">
        <${d} className="flex items-center justify-between gap-3">
          <${d} className="flex items-center gap-2">
            <${d} className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Heart size={20} fill="currentColor" />
            </${d}>
            <${d}>
              <h1 className="text-lg font-bold text-foreground">{t('home.greeting', { name: firstName })}</h1>
              <p className="text-sm text-muted">{t('home.subtitle')}</p>
            </${d}>
          </${d}>
          <button
            type="button"
            onClick={() => navigate('/my-profile')}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-bold text-white"
            aria-label={t('myProfile.title')}
          >
            {firstName.charAt(0).toUpperCase()}
          </button>
        </${d}>

        <${d} className="flex flex-col items-center py-2">`

if (!s.includes(oldBlock)) {
  throw new Error('Home block not found')
}
s = s.replace(oldBlock, newBlock)
fs.writeFileSync(p, s)
console.log('HomePage patched')
