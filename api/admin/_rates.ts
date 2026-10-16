import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { isAdminRequest } from '../../src/lib/adminAuth.js'
import { prisma } from '../../src/lib/prisma.js'

const schema = z.object({
  name: z.string().trim().min(2).max(100), serviceType: z.enum(['EXPRESS_INTL','STANDARD_INTL','CARGO_FREIGHT','ECOMMERCE','BUSINESS_LOGISTICS','DOOR_TO_DOOR']),
  originCountry: z.string().trim().max(100).optional(), destinationCountry: z.string().trim().max(100).optional(),
  originPostalPrefix: z.string().trim().max(20).optional(), destinationPostalPrefix: z.string().trim().max(20).optional(),
  packageType: z.enum(['Document','Parcel','Pallet','Container']).optional(), basePrice: z.number().min(0),
  pricePerKg: z.number().min(0), minimumCharge: z.number().min(0), currency: z.string().trim().length(3).toUpperCase(),
  minimumDays: z.number().int().min(1).max(120), maximumDays: z.number().int().min(1).max(180),
}).refine(value => value.maximumDays >= value.minimumDays, { message: 'Maximum transit days must be at least the minimum.' })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Admin sign-in required.' })
  try {
    if (req.method === 'GET') return res.status(200).json({ rates: await prisma.quoteRate.findMany({ orderBy: [{ active: 'desc' }, { serviceType: 'asc' }, { name: 'asc' }] }) })
    if (req.method === 'POST') {
      const parsed = schema.safeParse(req.body)
      if (!parsed.success) return res.status(400).json({ error: 'Check the rate details.', details: parsed.error.flatten() })
      const rate = await prisma.quoteRate.create({ data: { ...parsed.data, originCountry: parsed.data.originCountry || null, destinationCountry: parsed.data.destinationCountry || null, originPostalPrefix: parsed.data.originPostalPrefix || null, destinationPostalPrefix: parsed.data.destinationPostalPrefix || null, packageType: parsed.data.packageType || null } })
      return res.status(201).json({ rate })
    }
    if (req.method === 'PATCH') {
      const body = z.object({ id: z.string().uuid(), active: z.boolean() }).safeParse(req.body)
      if (!body.success) return res.status(400).json({ error: 'Invalid rate update.' })
      const rate = await prisma.quoteRate.update({ where: { id: body.data.id }, data: { active: body.data.active } })
      return res.status(200).json({ rate })
    }
    res.setHeader('Allow', 'GET, POST, PATCH')
    return res.status(405).json({ error: 'Method not allowed.' })
  } catch (error) {
    console.error('Admin rate operation failed', error)
    return res.status(503).json({ error: 'Rate management is temporarily unavailable.' })
  }
}
