import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { prisma } from '../../src/lib/prisma.js'

const eventSchema = z.object({
  trackingNumber: z.string().trim().min(6).max(40),
  status: z.enum(['LABEL_CREATED', 'COLLECTED', 'ORIGIN_GATEWAY', 'IN_TRANSIT', 'CUSTOMS_HOLD', 'CUSTOMS_CLEARED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION']),
  location: z.string().trim().min(2).max(160),
  facility: z.string().trim().max(160).optional(),
  description: z.string().trim().min(3).max(500),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  timestamp: z.coerce.date().optional(),
  signedBy: z.string().trim().max(120).optional(),
}).refine(value => (value.latitude === undefined) === (value.longitude === undefined), {
  message: 'Latitude and longitude must be provided together.',
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })
  const expectedKey = process.env.DISPATCH_API_KEY
  if (!expectedKey || req.headers['x-dispatch-key'] !== expectedKey) return res.status(401).json({ error: 'Unauthorized.' })
  const parsed = eventSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid event.', details: parsed.error.flatten() })

  try {
    const input = parsed.data
    const result = await prisma.$transaction(async tx => {
      const shipment = await tx.shipment.findUnique({ where: { trackingNumber: input.trackingNumber } })
      if (!shipment) return null
      await tx.trackingEvent.create({
        data: {
          shipmentId: shipment.id, status: input.status, location: input.location,
          facility: input.facility, description: input.description,
          latitude: input.latitude, longitude: input.longitude,
          timestamp: input.timestamp,
        },
      })
      return tx.shipment.update({
        where: { id: shipment.id },
        data: {
          status: input.status,
          ...(input.status === 'DELIVERED' ? { deliveredAt: input.timestamp ?? new Date(), signedBy: input.signedBy } : {}),
        },
        select: { trackingNumber: true, status: true, updatedAt: true },
      })
    })
    if (!result) return res.status(404).json({ error: 'Shipment not found.' })
    return res.status(201).json({ shipment: result })
  } catch (error) {
    console.error('Tracking event write failed', error)
    return res.status(503).json({ error: 'Could not record this tracking event.' })
  }
}
