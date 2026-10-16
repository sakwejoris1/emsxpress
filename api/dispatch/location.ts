import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { prisma } from '../../src/lib/prisma.js'

const pingSchema = z.object({
  trackingNumber: z.string().trim().min(6).max(40), latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180),
  timestamp: z.coerce.date().optional(), source: z.string().trim().min(2).max(120),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })
  const expectedKey = process.env.DISPATCH_API_KEY
  if (!expectedKey || req.headers['x-dispatch-key'] !== expectedKey) return res.status(401).json({ error: 'Unauthorized.' })
  const parsed = pingSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid location update.', details: parsed.error.flatten() })
  try {
    const { trackingNumber, latitude, longitude, source } = parsed.data
    const recordedAt = parsed.data.timestamp ?? new Date()
    if (recordedAt.getTime() > Date.now() + 5 * 60_000) return res.status(400).json({ error: 'Location timestamp cannot be more than five minutes in the future.' })
    const shipment = await prisma.shipment.findUnique({ where: { trackingNumber }, select: { id: true, status: true } })
    if (!shipment) return res.status(404).json({ error: 'Shipment not found.' })
    const current = await prisma.shipmentPosition.findUnique({ where: { shipmentId: shipment.id } })
    if (current && recordedAt <= current.recordedAt) return res.status(200).json({ location: current, ignored: true })
    const position = await prisma.shipmentPosition.upsert({
      where: { shipmentId: shipment.id },
      create: { shipmentId: shipment.id, latitude, longitude, source, recordedAt },
      update: { latitude, longitude, source, recordedAt },
    })
    return res.status(200).json({ location: position })
  } catch (error) {
    console.error('GPS location ingest failed', error)
    return res.status(503).json({ error: 'Could not save the location update.' })
  }
}
