import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { isAdminRequest } from '../../src/lib/adminAuth.js'
import { prisma } from '../../src/lib/prisma.js'

const statuses = ['LABEL_CREATED', 'COLLECTED', 'ORIGIN_GATEWAY', 'IN_TRANSIT', 'CUSTOMS_HOLD', 'CUSTOMS_CLEARED', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION'] as const
const serviceTypes = ['EXPRESS_INTL', 'STANDARD_INTL', 'CARGO_FREIGHT', 'ECOMMERCE', 'BUSINESS_LOGISTICS', 'DOOR_TO_DOOR'] as const

const createSchema = z.object({
  trackingNumber: z.string().trim().min(6).max(40).regex(/^[A-Z0-9-]+$/),
  serviceType: z.enum(serviceTypes),
  senderName: z.string().trim().min(2).max(120), senderAddress: z.string().trim().min(3).max(240),
  senderCity: z.string().trim().min(2).max(100), senderCountry: z.string().trim().min(2).max(100),
  receiverName: z.string().trim().min(2).max(120), receiverAddress: z.string().trim().min(3).max(240),
  receiverCity: z.string().trim().min(2).max(100), receiverCountry: z.string().trim().min(2).max(100),
  weightKg: z.number().positive().max(30000), estimatedDelivery: z.coerce.date().optional(),
  senderLatitude: z.number().min(-90).max(90).optional(), senderLongitude: z.number().min(-180).max(180).optional(),
  receiverLatitude: z.number().min(-90).max(90).optional(), receiverLongitude: z.number().min(-180).max(180).optional(),
}).refine(value => (value.senderLatitude === undefined) === (value.senderLongitude === undefined), { message: 'Origin coordinates must be supplied together.' })
  .refine(value => (value.receiverLatitude === undefined) === (value.receiverLongitude === undefined), { message: 'Destination coordinates must be supplied together.' })

const eventSchema = z.object({
  trackingNumber: z.string().trim().min(6).max(40), status: z.enum(statuses),
  location: z.string().trim().min(2).max(160), facility: z.string().trim().max(160).optional(),
  description: z.string().trim().min(3).max(500), latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(), timestamp: z.coerce.date().optional(),
  signedBy: z.string().trim().max(120).optional(), estimatedDelivery: z.coerce.date().optional(),
}).refine(value => (value.latitude === undefined) === (value.longitude === undefined), { message: 'Latitude and longitude must be supplied together.' })

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Admin sign-in required.' })

  try {
    if (req.method === 'GET') {
      const [shipments, counts] = await Promise.all([
        prisma.shipment.findMany({
          orderBy: { updatedAt: 'desc' }, take: 250,
          select: {
            trackingNumber: true, serviceType: true, status: true, senderName: true,
            senderCity: true, senderCountry: true, senderLatitude: true, senderLongitude: true,
            receiverName: true, receiverCity: true, receiverCountry: true, receiverLatitude: true, receiverLongitude: true,
            weightKg: true, estimatedDelivery: true, signedBy: true, deliveredAt: true, updatedAt: true,
            events: { orderBy: { timestamp: 'desc' }, take: 20 },
          },
        }),
        prisma.shipment.groupBy({ by: ['status'], _count: { _all: true } }),
      ])
      return res.status(200).json({ shipments, counts: Object.fromEntries(counts.map(item => [item.status, item._count._all])) })
    }

    if (req.method === 'POST') {
      const parsed = createSchema.safeParse(req.body)
      if (!parsed.success) return res.status(400).json({ error: 'Check the shipment details and try again.', details: parsed.error.flatten() })
      const input = parsed.data
      const shipment = await prisma.shipment.create({
        data: {
          ...input, status: 'LABEL_CREATED',
          events: { create: { status: 'LABEL_CREATED', location: `${input.senderCity}, ${input.senderCountry}`, facility: 'EMSXpress Admin', description: 'Shipment created by an administrator.', latitude: input.senderLatitude, longitude: input.senderLongitude } },
        },
        select: { trackingNumber: true },
      })
      return res.status(201).json({ shipment })
    }

    if (req.method === 'PATCH') {
      const parsed = eventSchema.safeParse(req.body)
      if (!parsed.success) return res.status(400).json({ error: 'Check the scan details and try again.', details: parsed.error.flatten() })
      const input = parsed.data
      const result = await prisma.$transaction(async tx => {
        const shipment = await tx.shipment.findUnique({ where: { trackingNumber: input.trackingNumber } })
        if (!shipment) return null
        await tx.trackingEvent.create({ data: {
          shipmentId: shipment.id, status: input.status, location: input.location,
          facility: input.facility, description: input.description,
          latitude: input.latitude, longitude: input.longitude, timestamp: input.timestamp,
        } })
        return tx.shipment.update({
          where: { id: shipment.id },
          data: {
            status: input.status,
            ...(input.estimatedDelivery ? { estimatedDelivery: input.estimatedDelivery } : {}),
            ...(input.status === 'DELIVERED' ? { deliveredAt: input.timestamp ?? new Date(), signedBy: input.signedBy || null } : {}),
          },
          select: { trackingNumber: true, status: true },
        })
      })
      if (!result) return res.status(404).json({ error: 'Shipment not found.' })
      return res.status(200).json({ shipment: result })
    }

    res.setHeader('Allow', 'GET, POST, PATCH')
    return res.status(405).json({ error: 'Method not allowed.' })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') return res.status(409).json({ error: 'That tracking number already exists.' })
    console.error('Admin shipment operation failed', error)
    return res.status(503).json({ error: 'The admin service is temporarily unavailable.' })
  }
}
