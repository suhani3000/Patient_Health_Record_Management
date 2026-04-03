/**
 * lib/crypto.ts  — CLIENT SIDE ONLY
 * Uses only the native Web Crypto API. Zero external dependencies.
 *
 * SCHEME:
 *  - Each user has an RSA-OAEP-2048 keypair generated on first login
 *  - Public key  → saved in MongoDB (User.encryptionPublicKey)
 *  - Private key → saved in localStorage as JWK (keyed by wallet address)
 *  - Each file   → encrypted with a random AES-256-GCM key
 *  - AES key     → RSA-encrypted with patient's public key → saved in MongoDB
 *  - Sharing     → AES key decrypted by patient, re-encrypted with doctor's public key
 */

const PRIV_KEY_PREFIX = "ehr_privkey_"

// ─── RSA-OAEP Key Pair ────────────────────────────────────────────────────────

export async function generateEncryptionKeyPair(): Promise<{
  publicKeyB64: string
  privateKeyJwk: JsonWebKey
}> {
  const keyPair = await crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256",
    },
    true,
    ["encrypt", "decrypt"]
  )

  const spki = await crypto.subtle.exportKey("spki", keyPair.publicKey)
  const publicKeyB64 = btoa(String.fromCharCode(...new Uint8Array(spki)))
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey)

  return { publicKeyB64, privateKeyJwk }
}

export function savePrivateKey(address: string, jwk: JsonWebKey): void {
  localStorage.setItem(`${PRIV_KEY_PREFIX}${address.toLowerCase()}`, JSON.stringify(jwk))
}

export function hasPrivateKey(address: string): boolean {
  return !!localStorage.getItem(`${PRIV_KEY_PREFIX}${address.toLowerCase()}`)
}

function loadPrivateKeyJwk(address: string): JsonWebKey {
  const raw = localStorage.getItem(`${PRIV_KEY_PREFIX}${address.toLowerCase()}`)
  if (!raw) throw new Error("No encryption key found. Please log out and log in again.")
  return JSON.parse(raw)
}

async function importPublicKey(b64: string): Promise<CryptoKey> {
  const bin = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  return crypto.subtle.importKey(
    "spki", bin,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false, ["encrypt"]
  )
}

async function importPrivateKey(jwk: JsonWebKey): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "jwk", jwk,
    { name: "RSA-OAEP", hash: "SHA-256" },
    false, ["decrypt"]
  )
}

// ─── AES-256-GCM File Encryption ──────────────────────────────────────────────

export async function encryptFile(fileBuffer: ArrayBuffer): Promise<{
  encryptedBuffer: ArrayBuffer
  aesKeyRaw: ArrayBuffer
  ivB64: string
}> {
  const aesKey = await crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]
  )
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, aesKey, fileBuffer
  )
  const aesKeyRaw = await crypto.subtle.exportKey("raw", aesKey)
  return {
    encryptedBuffer,
    aesKeyRaw,
    ivB64: btoa(String.fromCharCode(...iv)),
  }
}

export async function decryptFile(
  encryptedBuffer: ArrayBuffer,
  aesKeyRaw: ArrayBuffer,
  ivB64: string
): Promise<ArrayBuffer> {
  const iv = Uint8Array.from(atob(ivB64), (c) => c.charCodeAt(0))
  const aesKey = await crypto.subtle.importKey(
    "raw", aesKeyRaw, { name: "AES-GCM" }, false, ["decrypt"]
  )
  return crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, encryptedBuffer)
}

// ─── RSA Key Wrapping ─────────────────────────────────────────────────────────

/** Encrypt a raw AES key with someone's RSA public key */
export async function wrapAESKey(
  aesKeyRaw: ArrayBuffer,
  recipientPublicKeyB64: string
): Promise<string> {
  const pubKey = await importPublicKey(recipientPublicKeyB64)
  const encrypted = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, pubKey, aesKeyRaw)
  return btoa(String.fromCharCode(...new Uint8Array(encrypted)))
}

/** Decrypt an RSA-wrapped AES key using the wallet address's stored private key */
export async function unwrapAESKey(
  encryptedAESKeyB64: string,
  address: string
): Promise<ArrayBuffer> {
  const jwk = loadPrivateKeyJwk(address)
  const privKey = await importPrivateKey(jwk)
  const encrypted = Uint8Array.from(atob(encryptedAESKeyB64), (c) => c.charCodeAt(0))
  return crypto.subtle.decrypt({ name: "RSA-OAEP" }, privKey, encrypted)
}