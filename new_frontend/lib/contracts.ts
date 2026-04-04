/**
 * lib/contracts.ts
 *
 * Central registry for Thirdweb client, chain config, contract ABIs and addresses.
 * ABIs are hardcoded here so no cross-folder JSON imports are required.
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * SETUP: Add these to your new_frontend/.env.local before using on-chain calls:
 *
 *   NEXT_PUBLIC_THIRDWEB_CLIENT_ID=<your-thirdweb-client-id>
 *   NEXT_PUBLIC_EHR_REGISTRY_ADDRESS=0x<deployed-EHRRegistry-address>
 *   NEXT_PUBLIC_EHR_ACCESS_ADDRESS=0x<deployed-EHRAccess-address>
 *
 * Deploy contracts:  cd blockchain && npx hardhat run scripts/deploy.js --network localhost
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { createThirdwebClient, defineChain } from "thirdweb"

// ── Thirdweb Client ───────────────────────────────────────────────────────────
export const thirdwebClient = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID as string,
})

// ── Local Hardhat / Quorum Chain ──────────────────────────────────────────────
export const localChain = defineChain({
  id: 31337,
  rpc: "http://127.0.0.1:8545",
  nativeCurrency: {
    name: "Ether",
    symbol: "ETH",
    decimals: 18,
  },
})

// ── Contract Addresses (from environment) ─────────────────────────────────────
export const EHR_REGISTRY_ADDRESS =
  (process.env.NEXT_PUBLIC_EHR_REGISTRY_ADDRESS ?? "") as `0x${string}`

export const EHR_ACCESS_ADDRESS =
  (process.env.NEXT_PUBLIC_EHR_ACCESS_ADDRESS ?? "") as `0x${string}`

// ── EHRRegistry ABI ───────────────────────────────────────────────────────────
// Source: blockchain/contracts/EHRRegistry.sol
// Functions: registerFile(string _category), getFiles(address _patient)
// Events:    FileRegistered(address indexed patient, uint256 indexed fileId, string category)
export const EHRRegistryABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "patient",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "fileId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "string",
        name: "category",
        type: "string",
      },
    ],
    name: "FileRegistered",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "address",
        name: "_patient",
        type: "address",
      },
    ],
    name: "getFiles",
    outputs: [
      {
        components: [
          {
            internalType: "uint256",
            name: "fileId",
            type: "uint256",
          },
          {
            internalType: "string",
            name: "category",
            type: "string",
          },
          {
            internalType: "uint256",
            name: "timestamp",
            type: "uint256",
          },
        ],
        internalType: "struct EHRRegistry.FileMeta[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "string",
        name: "_category",
        type: "string",
      },
    ],
    name: "registerFile",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

// ── EHRAccess ABI ─────────────────────────────────────────────────────────────
// Source: blockchain/contracts/EHRAccess.sol
// Enum AccessType: NONE=0, VIEW=1, UPLOAD=2, BOTH=3
// Functions: grantAccess(address _doctor, uint256 _fileId, AccessType _access)
//            revokeAccess(address _doctor, uint256 _fileId)
//            checkAccess(address _patient, address _doctor, uint256 _fileId) → AccessType
//            grantBatchAccess(address doctor, uint256[] fileIds, AccessType access)
// Events:    AccessGranted(patient, doctor, fileId, access)
//            AccessRevoked(patient, doctor, fileId)
export const EHRAccessABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "patient",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "doctor",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "fileId",
        type: "uint256",
      },
      {
        indexed: false,
        internalType: "uint8", // AccessType enum stored as uint8
        name: "access",
        type: "uint8",
      },
    ],
    name: "AccessGranted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "patient",
        type: "address",
      },
      {
        indexed: true,
        internalType: "address",
        name: "doctor",
        type: "address",
      },
      {
        indexed: true,
        internalType: "uint256",
        name: "fileId",
        type: "uint256",
      },
    ],
    name: "AccessRevoked",
    type: "event",
  },
  {
    inputs: [
      { internalType: "address", name: "_doctor", type: "address" },
      { internalType: "uint256", name: "_fileId", type: "uint256" },
      { internalType: "uint8", name: "_access", type: "uint8" },
    ],
    name: "grantAccess",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_doctor", type: "address" },
      { internalType: "uint256", name: "_fileId", type: "uint256" },
    ],
    name: "revokeAccess",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "_patient", type: "address" },
      { internalType: "address", name: "_doctor", type: "address" },
      { internalType: "uint256", name: "_fileId", type: "uint256" },
    ],
    name: "checkAccess",
    outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "doctor", type: "address" },
      { internalType: "uint256[]", name: "fileIds", type: "uint256[]" },
      { internalType: "uint8", name: "access", type: "uint8" },
    ],
    name: "grantBatchAccess",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const

// ── AccessType enum helper (mirrors EHRAccess.sol) ────────────────────────────
export const AccessType = {
  NONE: 0,
  VIEW: 1,
  UPLOAD: 2,
  BOTH: 3,
} as const

/** Maps the frontend accessLevel string to the on-chain AccessType uint8 */
export function toAccessTypeUint(
  accessLevel: "view" | "upload" | "view-upload"
): number {
  switch (accessLevel) {
    case "view":
      return AccessType.VIEW
    case "upload":
      return AccessType.UPLOAD
    case "view-upload":
      return AccessType.BOTH
    default:
      return AccessType.NONE
  }
}
