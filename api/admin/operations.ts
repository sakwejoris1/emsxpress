import type { VercelRequest, VercelResponse } from '@vercel/node'
import rates from './_rates.js'
import locations from './_locations.js'
import inquiries from './_inquiries.js'
import invoices from './_invoices.js'
import position from './_position.js'

const operations: Record<string, (req: VercelRequest, res: VercelResponse) => unknown> = {
  rates,
  locations,
  inquiries,
  invoices,
  position,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const resource = Array.isArray(req.query.resource) ? req.query.resource[0] : req.query.resource
  const operation = resource ? operations[resource] : undefined
  if (!operation) return res.status(404).json({ error: 'Admin operation not found.' })
  return operation(req, res)
}
