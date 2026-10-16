import type { VercelRequest } from '@vercel/node'

export function hashPassword(password: string): Promise<string>
export function verifyPassword(password: string, stored: string | null): Promise<boolean>
export function createUserCookie(userId: string): string
export function clearUserCookie(): string
export function getUserId(req: VercelRequest): string | null
