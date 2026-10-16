import { PrismaClient } from '@prisma/client'

// This project intentionally does not seed sample shipments, quotes, or locations.
// Add only real operational data through the authenticated admin tools.
const prisma = new PrismaClient()
try {
  console.log('No sample operational data was seeded.')
} finally {
  await prisma.$disconnect()
}
