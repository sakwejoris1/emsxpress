import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { clearUserCookie, createUserCookie, getUserId, hashPassword, verifyPassword } from '../src/lib/userSession.js'
import { prisma } from '../src/lib/prisma.js'

const registerSchema = z.object({
  action: z.literal('register'), accountType: z.enum(['personal','business']), fullName: z.string().trim().min(2).max(120),
  companyName: z.string().trim().max(120).optional(), email: z.string().trim().email().max(254), phone: z.string().trim().min(6).max(40),
  password: z.string().min(8).max(128).regex(/\d/).regex(/[^A-Za-z0-9]/),
}).refine(value => value.accountType !== 'business' || Boolean(value.companyName), { message: 'Business accounts need a company name.' })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') {
    const userId = getUserId(req)
    if (!userId) return res.status(200).json({ authenticated: false })
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true, companyName: true } })
    return res.status(200).json({ authenticated: Boolean(user), user })
  }
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearUserCookie())
    return res.status(200).json({ authenticated: false })
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })
  try {
    if (req.body?.action === 'register') {
      const parsed = registerSchema.safeParse(req.body)
      if (!parsed.success) return res.status(400).json({ error: 'Check the account details.', details: parsed.error.flatten() })
      const input = parsed.data
      const user = await prisma.user.create({ data: {
        email: input.email.toLowerCase(), name: input.fullName, phone: input.phone,
        companyName: input.accountType === 'business' ? input.companyName : null,
        role: input.accountType === 'business' ? 'BUSINESS' : 'CUSTOMER', passwordHash: await hashPassword(input.password),
      }, select: { id: true, email: true, name: true, role: true, companyName: true } })
      res.setHeader('Set-Cookie', createUserCookie(user.id))
      return res.status(201).json({ authenticated: true, user })
    }
    const parsed = z.object({ action: z.literal('login'), email: z.string().trim().email().max(254), password: z.string().min(1).max(128) }).safeParse(req.body)
    if (!parsed.success) return res.status(400).json({ error: 'Enter a valid email and password.' })
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) return res.status(401).json({ error: 'Email or password is incorrect.' })
    res.setHeader('Set-Cookie', createUserCookie(user.id))
    return res.status(200).json({ authenticated: true, user: { id: user.id, email: user.email, name: user.name, role: user.role, companyName: user.companyName } })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') return res.status(409).json({ error: 'An account with this email already exists.' })
    console.error('Account authentication failed', error)
    return res.status(503).json({ error: 'Account service is temporarily unavailable.' })
  }
}
