import { createHmac, createHash, timingSafeEqual } from 'node:crypto'

const cookieName = 'emsxpress_admin'
const sessionHours = 8

const signatureFor = expires => createHmac('sha256', process.env.ADMIN_SESSION_SECRET || '')
  .update(`emsxpress-admin:${expires}`)
  .digest('base64url')

export function verifyAdminPassword(candidate) {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected || typeof candidate !== 'string') return false
  const suppliedHash = createHash('sha256').update(candidate).digest()
  const expectedHash = createHash('sha256').update(expected).digest()
  return timingSafeEqual(suppliedHash, expectedHash)
}

export function createAdminCookie() {
  const expires = Math.floor(Date.now() / 1000) + sessionHours * 60 * 60
  const value = `${expires}.${signatureFor(expires)}`
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${cookieName}=${value}; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=${sessionHours * 60 * 60}${secure}`
}

export function clearAdminCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${cookieName}=; HttpOnly; SameSite=Strict; Path=/api/admin; Max-Age=0${secure}`
}

export function isAdminRequest(req) {
  if (!process.env.ADMIN_SESSION_SECRET) return false
  const cookieHeader = req.headers.cookie || ''
  const token = cookieHeader.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
  if (!token) return false
  const [expires, signature] = token.split('.')
  if (!expires || !signature || !/^\d+$/.test(expires) || Number(expires) <= Math.floor(Date.now() / 1000)) return false
  const expected = Buffer.from(signatureFor(expires))
  const supplied = Buffer.from(signature)
  return expected.length === supplied.length && timingSafeEqual(expected, supplied)
}
