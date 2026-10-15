import type { VercelRequest } from '@vercel/node'

export function verifyAdminPassword(candidate: unknown): boolean
export function createAdminCookie(): string
export function clearAdminCookie(): string
export function isAdminRequest(req: VercelRequest): boolean
