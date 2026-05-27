/** Canonical Indian E.164: +91XXXXXXXXXX */
export const parseLoginMobile = (input) => {
  if (!input) return null
  const digits = String(input).replace(/\D/g, '')
  if (digits.length === 10) return `+91${digits}`
  if ((digits.length === 12 && digits.startsWith('91')) || (digits.length === 11 && digits.startsWith('91'))) {
    const national = digits.slice(-10)
    if (national.length === 10) return `+91${national}`
  }
  if (digits.length >= 10) {
    const national = digits.slice(-10)
    if (national.length === 10) return `+91${national}`
  }
  return null
}

/** All stored/lookup variants for legacy rows (9876543210 vs +919876543210). */
export const phoneLookupVariants = (input) => {
  const canonical = parseLoginMobile(input)
  if (!canonical) return []
  const national = canonical.slice(3)
  return [...new Set([canonical, `91${national}`, national, `0${national}`])]
}

export const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email).trim())
