export const omitPassword = (user) => {
  if (!user) return null
  const { password, ...safe } = user
  return safe
}

export const toAuthUser = (user, role) => ({
  id: user.id,
  mobile: user.phone,
  role: role === 'doctor' ? 'DOCTOR' : 'PATIENT',
})
