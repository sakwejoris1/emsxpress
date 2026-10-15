import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { prisma } from '../src/lib/prisma.js'

const querySchema = z.array(z.string().trim().min(1).max(40)).min(1).max(10)

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' })
  const rawNumbers = req.query.numbers
  const parsed = querySchema.safeParse((Array.isArray(rawNumbers) ? rawNumbers.join(',') : rawNumbers ?? '').split(/[\n,]+/).map(value => value.trim()).filter(Boolean))
  if (!parsed.success) return res.status(400).json({ error: 'Provide between 1 and 10 tracking numbers.' })

  try {
    const shipments = await prisma.shipment.findMany({
      where: { trackingNumber: { in: parsed.data } },
      select: {
        trackingNumber: true, serviceType: true, status: true,
        senderCity: true, senderCountry: true, senderLatitude: true, senderLongitude: true,
        receiverCity: true, receiverCountry: true, receiverLatitude: true, receiverLongitude: true,
        estimatedDelivery: true, signedBy: true, deliveredAt: true,
        events: { orderBy: { timestamp: 'desc' }, take: 50 },
      },
    })
    const byNumber = new Map(shipments.map(shipment => [shipment.trackingNumber, shipment]))
    return res.status(200).json({ shipments: parsed.data.map(number => byNumber.get(number) ?? null) })
  } catch (error) {
    console.error('Tracking lookup failed', error)
    return res.status(503).json({ error: 'Tracking is temporarily unavailable. Please try again shortly.' })
  }
}
