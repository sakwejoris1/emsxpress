import { createHmac, createHash, randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(scryptCallback)
const cookieName = 'emsxpress_user'
const sessionSecret = () => process.env.ADMIN_SESSION_SECRET || ''
const sign = value => createHmac('sha256', sessionSecret()).update(value).digest('base64url')

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('base64url')
  const derived = await scrypt(password, salt, 64)
  return `${salt}.${Buffer.from(derived).toString('base64url')}`
}

export async function verifyPassword(password, stored) {
  if (!stored || typeof password !== 'string') return false
  const [salt, hash] = stored.split('.')
  if (!salt || !hash) return false
  const candidate = Buffer.from(await scrypt(password, salt, 64))
  const expected = Buffer.from(hash, 'base64url')
  return candidate.length === expected.length && timingSafeEqual(candidate, expected)
}

export function createUserCookie(userId) {
  const expires = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 14
  const value = `${userId}.${expires}.${sign(`user:${userId}:${expires}`)}`
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${cookieName}=${value}; HttpOnly; SameSite=Lax; Path=/api; Max-Age=${60 * 60 * 24 * 14}${secure}`
}

export function clearUserCookie() {
  const secure = process.env.NODE_ENV === 'production' ? '; Secure' : ''
  return `${cookieName}=; HttpOnly; SameSite=Lax; Path=/api; Max-Age=0${secure}`
}

export function getUserId(req) {
  const header = req.headers.cookie || ''
  const token = header.split(';').map(part => part.trim()).find(part => part.startsWith(`${cookieName}=`))?.slice(cookieName.length + 1)
  if (!token) return null
  const [userId, expires, signature] = token.split('.')
  if (!userId || !expires || !signature || !/^\d+$/.test(expires) || Number(expires) <= Math.floor(Date.now() / 1000)) return null
  const expected = Buffer.from(sign(`user:${userId}:${expires}`))
  const supplied = Buffer.from(signature)
  return expected.length === supplied.length && timingSafeEqual(expected, supplied) ? userId : null
}
