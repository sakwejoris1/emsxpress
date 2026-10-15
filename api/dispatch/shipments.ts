import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { prisma } from '../../src/lib/prisma.js'

const shipmentSchema = z.object({
  trackingNumber: z.string().trim().min(6).max(40).regex(/^[A-Z0-9-]+$/),
  serviceType: z.enum(['EXPRESS_INTL', 'STANDARD_INTL', 'CARGO_FREIGHT', 'ECOMMERCE', 'BUSINESS_LOGISTICS', 'DOOR_TO_DOOR']),
  senderName: z.string().trim().min(2).max(120), senderAddress: z.string().trim().min(3).max(240),
  senderCity: z.string().trim().min(2).max(100), senderCountry: z.string().trim().min(2).max(100),
  receiverName: z.string().trim().min(2).max(120), receiverAddress: z.string().trim().min(3).max(240),
  receiverCity: z.string().trim().min(2).max(100), receiverCountry: z.string().trim().min(2).max(100),
  weightKg: z.number().positive().max(30000), estimatedDelivery: z.coerce.date().optional(),
  senderLatitude: z.number().min(-90).max(90).optional(), senderLongitude: z.number().min(-180).max(180).optional(),
  receiverLatitude: z.number().min(-90).max(90).optional(), receiverLongitude: z.number().min(-180).max(180).optional(),
}).refine(value => (value.senderLatitude === undefined) === (value.senderLongitude === undefined), { message: 'Sender coordinates must be provided together.' })
  .refine(value => (value.receiverLatitude === undefined) === (value.receiverLongitude === undefined), { message: 'Receiver coordinates must be provided together.' })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })
  const expectedKey = process.env.DISPATCH_API_KEY
  if (!expectedKey || req.headers['x-dispatch-key'] !== expectedKey) return res.status(401).json({ error: 'Unauthorized.' })
  const parsed = shipmentSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Invalid shipment.', details: parsed.error.flatten() })

  try {
    const input = parsed.data
    const shipment = await prisma.shipment.create({
      data: {
        ...input,
        status: 'LABEL_CREATED',
        events: { create: {
          status: 'LABEL_CREATED', location: `${input.senderCity}, ${input.senderCountry}`,
          description: 'Shipment record created. Awaiting collection scan.',
          latitude: input.senderLatitude, longitude: input.senderLongitude,
        } },
      },
      select: { trackingNumber: true, status: true, createdAt: true },
    })
    return res.status(201).json({ shipment })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') return res.status(409).json({ error: 'That tracking number already exists.' })
    console.error('Shipment create failed', error)
    return res.status(503).json({ error: 'Could not create this shipment.' })
  }
}
