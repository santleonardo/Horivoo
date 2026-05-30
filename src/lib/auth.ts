import { SignJWT, jwtVerify } from 'jose'
import { db } from '@/lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'horivoo-secret-2025'

/**
 * Hash a password using SHA-256 with a 'horivoo:' prefix.
 */
export async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
  return `horivoo:${hashHex}`
}

/**
 * Verify a password against a stored hash.
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  const inputHash = await hashPassword(password)
  return inputHash === hash
}

/**
 * Create a JWT token with a 7-day expiry using HS256.
 */
export async function createToken(payload: {
  userId: string
  email: string
  role: string
}): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET)
  const token = await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(secret)
  return token
}

/**
 * Verify and decode a JWT token. Returns the payload or null if invalid.
 */
export async function verifyToken(
  token: string
): Promise<{ userId: string; email: string; role: string } | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    return payload as unknown as {
      userId: string
      email: string
      role: string
    }
  } catch {
    return null
  }
}

/**
 * Extract Bearer token from Authorization header.
 */
export function getTokenFromHeaders(request: Request): string | null {
  const authHeader = request.headers.get('Authorization')
  if (!authHeader) return null
  const parts = authHeader.split(' ')
  if (parts.length !== 2 || parts[0] !== 'Bearer') return null
  return parts[1]
}

/**
 * Verify the token from the request and return the decoded user info.
 */
export async function getUserFromRequest(request: Request): Promise<{
  userId: string
  email: string
  role: string
} | null> {
  const token = getTokenFromHeaders(request)
  if (!token) return null
  const payload = await verifyToken(token)
  return payload
}
