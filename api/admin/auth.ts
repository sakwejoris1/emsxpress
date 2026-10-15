import type { VercelRequest, VercelResponse } from '@vercel/node'
import { clearAdminCookie, createAdminCookie, isAdminRequest, verifyAdminPassword } from '../../src/lib/adminAuth.js'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === 'GET') return res.status(200).json({ authenticated: isAdminRequest(req) })
  if (req.method === 'POST') {
    if (!verifyAdminPassword(req.body?.password)) return res.status(401).json({ error: 'The admin password is incorrect.' })
    res.setHeader('Set-Cookie', createAdminCookie())
    return res.status(200).json({ authenticated: true })
  }
  if (req.method === 'DELETE') {
    res.setHeader('Set-Cookie', clearAdminCookie())
    return res.status(200).json({ authenticated: false })
  }
  res.setHeader('Allow', 'GET, POST, DELETE')
  return res.status(405).json({ error: 'Method not allowed.' })
}
