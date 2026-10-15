import { PrismaClient } from '@prisma/client'

const prismaGlobal = globalThis

export const prisma = prismaGlobal.emsxpressPrisma ?? new PrismaClient()
prismaGlobal.emsxpressPrisma = prisma
