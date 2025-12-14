// Password Hashing Utilities

export async function hashPassword(password: string): Promise<string> {
  // In production, use bcrypt:
  // const bcrypt = require('bcrypt')
  // return bcrypt.hash(password, 10)

  // Mock implementation for demo
  return `hashed_${password}_${Date.now()}`
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  // In production, use bcrypt:
  // const bcrypt = require('bcrypt')
  // return bcrypt.compare(password, hash)

  // Mock implementation for demo
  return hash.includes(password)
}
