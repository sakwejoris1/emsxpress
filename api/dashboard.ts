import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { randomBytes } from 'node:crypto'
import { getUserId } from '../src/lib/userSession.js'
import { prisma } from '../src/lib/prisma.js'

const itemSchema = z.object({
  trackingNumber: z.string().trim().min(6).max(40).regex(/^[A-Z0-9-]+$/).optional(), serviceType: z.enum(['EXPRESS_INTL','STANDARD_INTL','CARGO_FREIGHT','ECOMMERCE','BUSINESS_LOGISTICS','DOOR_TO_DOOR']),
  senderName: z.string().trim().min(2).max(120), senderAddress: z.string().trim().min(3).max(240), senderCity: z.string().trim().min(2).max(100), senderCountry: z.string().trim().min(2).max(100), senderPostalCode: z.string().trim().max(20).optional(),
  receiverName: z.string().trim().min(2).max(120), receiverAddress: z.string().trim().min(3).max(240), receiverCity: z.string().trim().min(2).max(100), receiverCountry: z.string().trim().min(2).max(100), receiverPostalCode: z.string().trim().max(20).optional(),
  packageType: z.string().trim().max(30).optional(), weightKg: z.coerce.number().positive().max(30000), lengthCm: z.coerce.number().positive().optional(), widthCm: z.coerce.number().positive().optional(), heightCm: z.coerce.number().positive().optional(),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const userId = getUserId(req)
  if (!userId) return res.status(401).json({ error: 'Sign in to your shipper account.' })
  try {
    if (req.method === 'GET') {
      const [user, shipments, invoices] = await Promise.all([
        prisma.user.findUnique({ where: { id: userId }, select: { id: true, email: true, name: true, role: true, companyName: true } }),
        prisma.shipment.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' }, take: 500, include: { events: { orderBy: { timestamp: 'desc' }, take: 1 } } }),
        prisma.invoice.findMany({ where: { userId }, orderBy: { issuedAt: 'desc' }, include: { items: true } }),
      ])
      return res.status(200).json({ user, shipments, invoices })
    }
    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })
    const body = z.object({ shipments: z.array(itemSchema).min(1).max(500) }).safeParse(req.body)
    if (!body.success) return res.status(400).json({ error: 'Manifest rows need tracking, service, sender, receiver, and weight fields.', details: body.error.flatten() })
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { id: true, role: true } })
    if (!user) return res.status(401).json({ error: 'Sign in to your shipper account.' })
    const prepared = []
    for (const input of body.data.shipments) {
      const trackingNumber = input.trackingNumber?.toUpperCase() || `EMS-${randomBytes(6).toString('hex').toUpperCase()}`
      const packageType = input.packageType || 'Parcel'
      const rates = await prisma.quoteRate.findMany({ where: { active: true, serviceType: input.serviceType } })
      const rate = rates.filter(item => (!item.originCountry || item.originCountry.toLowerCase() === input.senderCountry.toLowerCase()) && (!item.destinationCountry || item.destinationCountry.toLowerCase() === input.receiverCountry.toLowerCase()) && (!item.originPostalPrefix || input.senderPostalCode?.toLowerCase().startsWith(item.originPostalPrefix.toLowerCase())) && (!item.destinationPostalPrefix || input.receiverPostalCode?.toLowerCase().startsWith(item.destinationPostalPrefix.toLowerCase())) && (!item.packageType || item.packageType.toLowerCase() === packageType.toLowerCase())).sort((a, b) => (Number(Boolean(b.originCountry))+Number(Boolean(b.destinationCountry))+Number(Boolean(b.originPostalPrefix))+Number(Boolean(b.destinationPostalPrefix))+Number(Boolean(b.packageType))) - (Number(Boolean(a.originCountry))+Number(Boolean(a.destinationCountry))+Number(Boolean(a.originPostalPrefix))+Number(Boolean(a.destinationPostalPrefix))+Number(Boolean(a.packageType))))[0]
      if (!rate) return res.status(422).json({ error: `No active rate for ${input.serviceType.replaceAll('_',' ')} from ${input.senderCountry} to ${input.receiverCountry}.` })
      const dims = input.lengthCm && input.widthCm && input.heightCm ? input.lengthCm * input.widthCm * input.heightCm / 5000 : 0
      const billable = Math.max(input.weightKg, dims)
      const price = Math.round(Math.max(rate.minimumCharge, rate.basePrice + rate.pricePerKg * billable) * 100) / 100
      prepared.push({ input, trackingNumber, packageType, price, currency: rate.currency })
    }
    const results = await prisma.$transaction(prepared.map(({ input, trackingNumber, packageType, price, currency }) => prisma.shipment.create({ data: {
      ...input, trackingNumber, packageType, userId: user.id, quotedPrice: price, currency, status: 'LABEL_CREATED',
      events: { create: { status: 'LABEL_CREATED', location: `${input.senderCity}, ${input.senderCountry}`, facility: 'Shipper booking', description: 'Shipment booked by the business account.' } },
    }, select: { trackingNumber: true, quotedPrice: true, currency: true } })))
    return res.status(201).json({ created: results.length, shipments: results })
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'P2002') return res.status(409).json({ error: 'A tracking number in this manifest already exists.' })
    console.error('Business dashboard request failed', error)
    return res.status(503).json({ error: 'Business dashboard is temporarily unavailable.' })
  }
}
