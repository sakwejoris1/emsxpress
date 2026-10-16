import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { isAdminRequest } from '../../src/lib/adminAuth.js'
import { prisma } from '../../src/lib/prisma.js'

const schema = z.object({
  name: z.string().trim().min(2).max(120), type: z.string().trim().min(2).max(60), address: z.string().trim().min(4).max(240),
  city: z.string().trim().min(2).max(100), country: z.string().trim().min(2).max(100), postalCode: z.string().trim().max(30).optional(),
  hours: z.string().trim().min(3).max(160), cutoff: z.string().trim().max(120).optional(), latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180), services: z.array(z.string().trim().min(2).max(80)).max(20),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Admin sign-in required.' })
  try {
    if (req.method === 'GET') return res.status(200).json({ locations: await prisma.serviceLocation.findMany({ orderBy: [{ active: 'desc' }, { country: 'asc' }, { city: 'asc' }] }) })
    if (req.method === 'POST') {
      const parsed = schema.safeParse(req.body)
      if (!parsed.success) return res.status(400).json({ error: 'Check the location details.', details: parsed.error.flatten() })
      return res.status(201).json({ location: await prisma.serviceLocation.create({ data: { ...parsed.data, postalCode: parsed.data.postalCode || null, cutoff: parsed.data.cutoff || null } }) })
    }
    if (req.method === 'PATCH') {
      const body = z.object({ id: z.string().uuid(), active: z.boolean() }).safeParse(req.body)
      if (!body.success) return res.status(400).json({ error: 'Invalid location update.' })
      return res.status(200).json({ location: await prisma.serviceLocation.update({ where: { id: body.data.id }, data: { active: body.data.active } }) })
    }
    res.setHeader('Allow', 'GET, POST, PATCH')
    return res.status(405).json({ error: 'Method not allowed.' })
  } catch (error) {
    console.error('Admin location operation failed', error)
    return res.status(503).json({ error: 'Location management is temporarily unavailable.' })
  }
}
