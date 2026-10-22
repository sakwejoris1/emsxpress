import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { isAdminRequest } from '../../src/lib/adminAuth.js'
import { prisma } from '../../src/lib/prisma.js'

const positionSchema = z.object({
  trackingNumber: z.string().trim().min(6).max(40),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  accuracy: z.number().min(0).max(100000).optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed.' })
  }
  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Admin sign-in required.' })

  const parsed = positionSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid live location update.', details: parsed.error.flatten() })

  try {
    const { trackingNumber, latitude, longitude, accuracy } = parsed.data
    const shipment = await prisma.shipment.findUnique({ where: { trackingNumber }, select: { id: true, status: true } })
    if (!shipment) return res.status(404).json({ error: 'Shipment not found.' })
    if (shipment.status === 'DELIVERED') return res.status(409).json({ error: 'Live location sharing has ended for this delivered shipment.' })

    const recordedAt = new Date()
    const position = await prisma.shipmentPosition.upsert({
      where: { shipmentId: shipment.id },
      create: { shipmentId: shipment.id, latitude, longitude, source: `dispatcher-browser${accuracy == null ? '' : ` · ±${Math.round(accuracy)}m`}`, recordedAt },
      update: { latitude, longitude, source: `dispatcher-browser${accuracy == null ? '' : ` · ±${Math.round(accuracy)}m`}`, recordedAt },
    })
    return res.status(200).json({ position })
  } catch (error) {
    console.error('Admin live position update failed', error)
    return res.status(503).json({ error: 'Could not save the live location.' })
  }
}
