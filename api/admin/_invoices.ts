import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { isAdminRequest } from '../../src/lib/adminAuth.js'
import { prisma } from '../../src/lib/prisma.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!isAdminRequest(req)) return res.status(401).json({ error: 'Admin sign-in required.' })
  try {
    if (req.method === 'GET') return res.status(200).json({ invoices: await prisma.invoice.findMany({ include: { user: { select: { email: true, name: true, companyName: true } }, items: true }, orderBy: { issuedAt: 'desc' }, take: 250 }) })
    if (req.method === 'PATCH') {
      const parsed = z.object({ id: z.string().uuid(), status: z.enum(['ISSUED','PAID','VOID']) }).safeParse(req.body)
      if (!parsed.success) return res.status(400).json({ error: 'Invalid invoice update.' })
      const invoice = await prisma.invoice.update({ where: { id: parsed.data.id }, data: { status: parsed.data.status, ...(parsed.data.status === 'PAID' ? { paidAt: new Date() } : {}) } })
      return res.status(200).json({ invoice })
    }
    if (req.method === 'POST') {
      const parsed = z.object({ email: z.string().email().max(254), period: z.string().regex(/^\d{4}-\d{2}$/), dueDate: z.coerce.date().optional() }).safeParse(req.body)
      if (!parsed.success) return res.status(400).json({ error: 'Provide a business email and billing month (YYYY-MM).' })
      const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
      if (!user || user.role !== 'BUSINESS') return res.status(404).json({ error: 'Business account not found.' })
      const [year, month] = parsed.data.period.split('-').map(Number)
      const periodStart = new Date(Date.UTC(year, month - 1, 1))
      const periodEnd = new Date(Date.UTC(year, month, 1))
      const existingNumber = `EMS-${year}${String(month).padStart(2, '0')}-${user.id.slice(0, 8).toUpperCase()}`
      const existing = await prisma.invoice.findUnique({ where: { invoiceNumber: existingNumber } })
      if (existing) return res.status(409).json({ error: 'An invoice already exists for this account and period.' })
      const shipments = await prisma.shipment.findMany({ where: { userId: user.id, createdAt: { gte: periodStart, lt: periodEnd }, quotedPrice: { not: null }, invoiceItems: { none: {} } }, orderBy: { createdAt: 'asc' } })
      if (!shipments.length) return res.status(422).json({ error: 'No unbilled, rated shipments were found for this account and period.' })
      const currency = shipments[0].currency
      if (shipments.some(shipment => shipment.currency !== currency)) return res.status(422).json({ error: 'Shipments use multiple currencies. Generate separate invoices by currency.' })
      const total = Math.round(shipments.reduce((sum, shipment) => sum + (shipment.quotedPrice ?? 0), 0) * 100) / 100
      const invoice = await prisma.invoice.create({ data: {
        invoiceNumber: existingNumber, userId: user.id, periodStart, periodEnd,
        dueDate: parsed.data.dueDate ?? new Date(Date.UTC(year, month, 15)), currency, total, status: 'ISSUED',
        items: { create: shipments.map(shipment => ({ shipmentId: shipment.id, description: `${shipment.trackingNumber} · ${shipment.serviceType.replaceAll('_', ' ')}`, quantity: 1, unitPrice: shipment.quotedPrice!, amount: shipment.quotedPrice! })) },
      }, include: { items: true } })
      return res.status(201).json({ invoice })
    }
    res.setHeader('Allow', 'GET, POST, PATCH')
    return res.status(405).json({ error: 'Method not allowed.' })
  } catch (error) {
    console.error('Admin invoice operation failed', error)
    return res.status(503).json({ error: 'Invoice management is temporarily unavailable.' })
  }
}
