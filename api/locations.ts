import type { VercelRequest, VercelResponse } from '@vercel/node'
import { prisma } from '../src/lib/prisma.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' })
  const rawQuery = Array.isArray(req.query.q) ? req.query.q[0] : req.query.q
  const q = typeof rawQuery === 'string' ? rawQuery.trim().slice(0, 100) : ''
  try {
    const locations = await prisma.serviceLocation.findMany({
      where: { active: true, ...(q ? { OR: [
        { city: { contains: q, mode: 'insensitive' as const } }, { country: { contains: q, mode: 'insensitive' as const } },
        { postalCode: { contains: q, mode: 'insensitive' as const } }, { name: { contains: q, mode: 'insensitive' as const } },
      ] } : {}) },
      orderBy: [{ country: 'asc' }, { city: 'asc' }], take: 100,
    })
    return res.status(200).json({ locations })
  } catch (error) {
    console.error('Service location search failed', error)
    return res.status(503).json({ error: 'Service locations are temporarily unavailable.' })
  }
}
