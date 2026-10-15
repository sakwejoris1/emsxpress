import { PrismaClient } from '@prisma/client'

const prismaGlobal = globalThis as unknown as { emsxpressPrisma?: PrismaClient }

export const prisma = prismaGlobal.emsxpressPrisma ?? new PrismaClient()
prismaGlobal.emsxpressPrisma = prisma
