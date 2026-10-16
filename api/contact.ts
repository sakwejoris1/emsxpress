import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { prisma } from '../src/lib/prisma.js'

const inquirySchema = z.object({
  name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(254),
  category: z.enum(['Dispatch', 'Claims', 'Sales']), trackingNumber: z.string().trim().max(40).optional(),
  message: z.string().trim().min(10).max(5000),
})

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })
  const parsed = inquirySchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Check the contact details and message.', details: parsed.error.flatten() })
  try {
    const inquiry = await prisma.contactInquiry.create({ data: { ...parsed.data, trackingNumber: parsed.data.trackingNumber || null }, select: { id: true, createdAt: true } })
    return res.status(201).json({ received: true, inquiryId: inquiry.id, receivedAt: inquiry.createdAt })
  } catch (error) {
    console.error('Contact inquiry save failed', error)
    return res.status(503).json({ error: 'We could not save your request. Please try again.' })
  }
}
