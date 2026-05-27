/** Canonical Indian E.164: +91XXXXXXXXXX (matches backend parseLoginMobile). */
export const formatIndianPhone = (input: string): string | null => {
  if (!input?.trim()) return null
  const digits = input.replace(/\D/g, '')
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

/** Store/display helper: keep +91 prefix, strip spaces. */
export const normalizePhoneForStorage = (input: string): string => {
  return formatIndianPhone(input) ?? input.replace(/\s/g, '')
}
