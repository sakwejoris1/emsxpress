import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { isAdminRequest } from '../../src/lib/adminAuth.js'
import { prisma } from '../../src/lib/prisma.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Admin sign-in required.' })
  try {
    if (req.method === 'GET') return res.status(200).json({ inquiries: await prisma.contactInquiry.findMany({ orderBy: { createdAt: 'desc' }, take: 250 }) })
    if (req.method === 'PATCH') {
      const parsed = z.object({ id: z.string().uuid(), status: z.enum(['NEW','IN_PROGRESS','RESOLVED']) }).safeParse(req.body)
      if (!parsed.success) return res.status(400).json({ error: 'Invalid inquiry update.' })
      return res.status(200).json({ inquiry: await prisma.contactInquiry.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status } }) })
    }
    res.setHeader('Allow', 'GET, PATCH')
    return res.status(405).json({ error: 'Method not allowed.' })
  } catch (error) {
    console.error('Admin inquiry operation failed', error)
    return res.status(503).json({ error: 'The support inbox is temporarily unavailable.' })
  }
}
