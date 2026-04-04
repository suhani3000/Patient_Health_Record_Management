/**
 * Shared helpers for viewing IPFS-backed encrypted medical records in the browser.
 * Client-only — uses decryptFile / unwrapAESKey from crypto.ts.
 */

import { decryptFile, unwrapAESKey } from "@/lib/crypto"

export type NormalizedEncryptedSlice = {
  cid: string
  encryptedAESKey?: string
  aesIV?: string
  fileType: string
}

/** Resolve Pinata gateway URL for a CID (trim whitespace). */
export function ipfsGatewayUrl(cid: string): string {
  return `https://gateway.pinata.cloud/ipfs/${encodeURIComponent(cid.trim())}`
}

/**
 * Coerce crypto fields from API/Mongo JSON (strings, occasional BSON Binary EJSON, numbers).
 * RSA/AES metadata must stay as the same base64 the client stored.
 */
export function coerceCryptoString(value: unknown): string | undefined {
  if (value == null) return undefined
  if (typeof value === "string" && value.length > 0) return value
  if (typeof value === "number") return String(value)
  if (typeof value === "object" && value !== null) {
    const o = value as Record<string, unknown>
    if ("$binary" in o) {
      const inner = o.$binary
      if (typeof inner === "string" && inner.length > 0) return inner
      if (inner && typeof inner === "object" && "base64" in inner) {
        const b64 = (inner as { base64?: string }).base64
        if (typeof b64 === "string" && b64.length > 0) return b64
      }
    }
  }
  return undefined
}

/**
 * Normalize Mongo/API shape differences (cid vs fileCID, aesIV vs aesIv, etc.).
 */
export function normalizeRecordForDecryption(record: unknown): NormalizedEncryptedSlice | null {
  if (!record || typeof record !== "object") return null
  const r = record as Record<string, unknown>

  const cidCandidates = [r.cid, r.fileCID, r.fileCid, r._cid].map(coerceCryptoString)
  const cidRaw = cidCandidates.find((x) => x && x.trim().length > 0)
  if (!cidRaw) return null

  const encCandidates = [r.encryptedAESKey, r.encryptedAesKey].map(coerceCryptoString)
  const encryptedAESKey = encCandidates.find((x) => x && x.length > 0)

  const ivCandidates = [r.aesIV, r.aesIv, r.iv].map(coerceCryptoString)
  const aesIV = ivCandidates.find((x) => x && x.length > 0)

  const ft = coerceCryptoString(r.fileType)
  const fileType = ft?.trim() ? ft.trim() : "application/octet-stream"

  return {
    cid: cidRaw.trim(),
    encryptedAESKey,
    aesIV,
    fileType,
  }
}

/**
 * Wallet address for localStorage key `ehr_privkey_${address}`:
 * prefer live Thirdweb account, else profile address from JWT user (same string we stored keys under).
 */
export function resolveWalletAddressForCrypto(
  activeAccountAddress: string | undefined,
  profileBlockchainAddress: string | undefined,
): string | undefined {
  const a = activeAccountAddress?.trim().toLowerCase()
  if (a) return a
  const p = profileBlockchainAddress?.trim().toLowerCase()
  if (p) return p
  return undefined
}

/** Open blob in new tab; if pop-up blocked, trigger download instead. */
export function openDecryptedBlob(blob: Blob, suggestedName: string): void {
  const url = URL.createObjectURL(blob)
  const newWin = window.open(url, "_blank", "noopener,noreferrer")
  if (!newWin) {
    const a = document.createElement("a")
    a.href = url
    a.download = suggestedName.replace(/[/\\?%*:|"<>]/g, "-") || "medical-record"
    a.rel = "noopener"
    document.body.appendChild(a)
    a.click()
    a.remove()
  }
  setTimeout(() => URL.revokeObjectURL(url), 120_000)
}

export async function fetchDecryptAndOpen(params: {
  cid: string
  /** RSA-wrapped AES key (patient: encryptedAESKey, doctor: myEncryptedAESKey) */
  wrappedKeyB64: string
  aesIV: string
  fileType: string
  walletAddressLower: string
  displayFileName: string
}): Promise<void> {
  const { cid, wrappedKeyB64, aesIV, fileType, walletAddressLower, displayFileName } = params

  const aesKeyRaw = await unwrapAESKey(wrappedKeyB64, walletAddressLower)
  const res = await fetch(ipfsGatewayUrl(cid))
  if (!res.ok) throw new Error(`IPFS gateway error (${res.status})`)
  const ciphertextBuffer = await res.arrayBuffer()
  const plain = await decryptFile(ciphertextBuffer, aesKeyRaw, aesIV)
  const blob = new Blob([plain], { type: fileType })
  openDecryptedBlob(blob, displayFileName)
}
