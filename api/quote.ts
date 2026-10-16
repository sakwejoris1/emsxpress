import type { VercelRequest, VercelResponse } from '@vercel/node'
import { z } from 'zod'
import { prisma } from '../src/lib/prisma.js'

const quoteSchema = z.object({
  originCountry: z.string().trim().min(2).max(100), destinationCountry: z.string().trim().min(2).max(100),
  originPostalCode: z.string().trim().min(2).max(20), destinationPostalCode: z.string().trim().min(2).max(20),
  packageType: z.enum(['Document', 'Parcel', 'Pallet', 'Container']),
  weightKg: z.coerce.number().positive().max(30000), lengthCm: z.coerce.number().positive().max(2000).optional(),
  widthCm: z.coerce.number().positive().max(2000).optional(), heightCm: z.coerce.number().positive().max(2000).optional(),
}).refine(value => [value.lengthCm, value.widthCm, value.heightCm].every(v => v === undefined) || [value.lengthCm, value.widthCm, value.heightCm].every(v => v !== undefined), { message: 'Enter all three dimensions or leave them blank.' })

function addBusinessDays(start: Date, days: number) {
  const date = new Date(start)
  let added = 0
  while (added < days) {
    date.setDate(date.getDate() + 1)
    if (date.getDay() !== 0 && date.getDay() !== 6) added++
  }
  return date
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' })
  const parsed = quoteSchema.safeParse(req.body)
  if (!parsed.success) return res.status(400).json({ error: 'Check your shipment details.', details: parsed.error.flatten() })
  try {
    const input = parsed.data
    const rates = await prisma.quoteRate.findMany({ where: { active: true } })
    const matching = rates.filter(rate =>
      (!rate.originCountry || rate.originCountry.toLowerCase() === input.originCountry.toLowerCase()) &&
      (!rate.destinationCountry || rate.destinationCountry.toLowerCase() === input.destinationCountry.toLowerCase()) &&
      (!rate.originPostalPrefix || input.originPostalCode.toLowerCase().startsWith(rate.originPostalPrefix.toLowerCase())) &&
      (!rate.destinationPostalPrefix || input.destinationPostalCode.toLowerCase().startsWith(rate.destinationPostalPrefix.toLowerCase())) &&
      (!rate.packageType || rate.packageType.toLowerCase() === input.packageType.toLowerCase()),
    )
    const byService = new Map<string, (typeof matching)[number]>()
    for (const rate of matching) {
      const previous = byService.get(rate.serviceType)
      const specificity = Number(Boolean(rate.originCountry)) + Number(Boolean(rate.destinationCountry)) + Number(Boolean(rate.originPostalPrefix)) + Number(Boolean(rate.destinationPostalPrefix)) + Number(Boolean(rate.packageType))
      const previousSpecificity = previous ? Number(Boolean(previous.originCountry)) + Number(Boolean(previous.destinationCountry)) + Number(Boolean(previous.originPostalPrefix)) + Number(Boolean(previous.destinationPostalPrefix)) + Number(Boolean(previous.packageType)) : -1
      if (!previous || specificity > previousSpecificity) byService.set(rate.serviceType, rate)
    }
    if (!byService.size) return res.status(200).json({ rates: [], message: 'No published rate covers this route yet. Contact our shipping team for a quote.' })

    const volumeKg = input.lengthCm && input.widthCm && input.heightCm ? input.lengthCm * input.widthCm * input.heightCm / 5000 : 0
    const billableWeightKg = Math.max(input.weightKg, volumeKg)
    const now = new Date()
    const result = [...byService.values()].map(rate => ({
      id: rate.id, serviceType: rate.serviceType, name: rate.name, currency: rate.currency,
      billableWeightKg: Math.ceil(billableWeightKg * 10) / 10,
      price: Math.round(Math.max(rate.minimumCharge, rate.basePrice + rate.pricePerKg * billableWeightKg) * 100) / 100,
      minimumDays: rate.minimumDays, maximumDays: rate.maximumDays,
      earliestDelivery: addBusinessDays(now, rate.minimumDays).toISOString(), latestDelivery: addBusinessDays(now, rate.maximumDays).toISOString(),
    })).sort((a, b) => a.price - b.price)
    return res.status(200).json({ rates: result })
  } catch (error) {
    console.error('Quote lookup failed', error)
    return res.status(503).json({ error: 'Rates are temporarily unavailable.' })
  }
}
