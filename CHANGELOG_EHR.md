# CHANGELOG_EHR.md

## Healthcare EHR Platform — Authentication & Blockchain Refactor
**Date:** 2026-03-20  
**Author:** Antigravity AI (pair-programming session)

---

## Summary

This release replaces traditional email/password authentication with Thirdweb's passwordless **In-App Wallet** (Email OTP / Google OAuth) and wires all dummy `Math.random()` blockchain transaction hashes to **real Solidity smart contract calls** via the Thirdweb SDK against a local Hardhat/Quorum node.

---

## Changes by File

### `new_frontend/lib/db/models.ts` _(MODIFIED)_

| Change | Detail |
|--------|--------|
| Fix `blockchainAddress` type | Was incorrectly typed as `{ type: string, required: false, unique: true, sparse: true }` (a Mongoose schema options object). Corrected to `blockchainAddress?: string`. |

---

### `new_frontend/app/page.tsx` _(MODIFIED — Phase 2)_

| Change | Detail |
|--------|--------|
| Removed | All email/password form state (`formData`, `handleLogin`, `handleSignup`) |
| Removed | `Input`, `Label`, `Tabs`, `TabsContent`, `TabsList`, `TabsTrigger` imports |
| Removed | Traditional login/signup tab UI |
| Added | `useRef(authCalledRef)` guard to prevent duplicate unified-auth calls |
| Added | `useEffect([account, selectedRole])` — fires when Thirdweb wallet connects and role is selected |
| Added | Auto-call to `POST /api/auth/unified` with `blockchainAddress`, `email`, `role` |
| Added | `needsProfileCompletion` redirect → `/doctor/complete-profile` or `/lab/complete-profile` |
| Updated | `showAuth` card replaced with role badge + `<WalletLogin />` + loading/error state |
| Added | `AlertTriangle` error display with back button that resets auth state cleanly |

---

### `new_frontend/app/api/auth/unified/route.ts` _(NEW — Phase 3)_

New `POST` handler that unifies login and auto-registration for wallet users.

| Logic | Detail |
|-------|--------|
| Lookup | Finds user by `blockchainAddress` (case-insensitive regex match) |
| Returning user | Checks `isBlocked`, generates JWT, returns `{ token, user }` |
| New Patient | `isVerified: true` (auto-approved, matching old `/api/auth/register` behavior) |
| New Doctor/Lab | `isVerified: false` (requires admin approval) + `needsProfileCompletion: true` |
| Password field | Stored as empty string `""` — wallet address is the credential |
| Display name | Derived from email prefix or wallet address prefix |

---

### `new_frontend/lib/contracts.ts` _(NEW — Phase 4)_

Central contract registry. No cross-folder JSON imports — all ABIs hardcoded inline.

| Export | Detail |
|--------|--------|
| `thirdwebClient` | Initialized with `NEXT_PUBLIC_THIRDWEB_CLIENT_ID` |
| `localChain` | `defineChain({ id: 1337, rpc: "http://127.0.0.1:8545" })` for Hardhat/Quorum |
| `EHR_REGISTRY_ADDRESS` | From `NEXT_PUBLIC_EHR_REGISTRY_ADDRESS` env var |
| `EHR_ACCESS_ADDRESS` | From `NEXT_PUBLIC_EHR_ACCESS_ADDRESS` env var |
| `EHRRegistryABI` | Full ABI for `EHRRegistry.sol` (registerFile, getFiles, FileRegistered event) |
| `EHRAccessABI` | Full ABI for `EHRAccess.sol` (grantAccess, revokeAccess, checkAccess, grantBatchAccess) |
| `AccessType` | Enum constant `{ NONE:0, VIEW:1, UPLOAD:2, BOTH:3 }` |
| `toAccessTypeUint()` | Maps `"view" \| "upload" \| "view-upload"` → on-chain `uint8` |

**Required `.env.local` additions:**
```
NEXT_PUBLIC_EHR_REGISTRY_ADDRESS=0x<deployed-address>
NEXT_PUBLIC_EHR_ACCESS_ADDRESS=0x<deployed-address>
```

---

### `new_frontend/components/patient/upload-dialog.tsx` _(REWRITTEN — Phase 5)_

| Change | Detail |
|--------|--------|
| File input | Now stores a real `File` object in state (was storing only the filename string) |
| Upload | Sends real `FormData` to `POST /api/patient/records` for IPFS upload via Pinata |
| Blockchain | Calls `EHRRegistry.registerFile(recordType)` via Thirdweb SDK on `localChain` |
| Event parse | Extracts `fileId` from `topics[2]` of the `FileRegistered` event log |
| DB update | `PATCH /api/patient/records/:id` saves `fileId` + `transactionHash` to MongoDB |
| Error handling | If node unreachable or env var missing → **explicit destructive toast**: _"⚠️ Blockchain transaction failed — saving off-chain only"_ |
| Stage feedback | Button label updates through `"Uploading to IPFS…"` → `"Registering on blockchain…"` → `"Saving record…"` |
| Inline warning | Amber banner shown when `NEXT_PUBLIC_EHR_REGISTRY_ADDRESS` is not set |

---

### `new_frontend/components/patient/grant-access-dialog.tsx` _(REWRITTEN — Phase 6)_

| Change | Detail |
|--------|--------|
| New prop | `fileId?: number` — scopes the on-chain grant to a specific record |
| Blockchain | Calls `EHRAccess.grantAccess(doctorAddress, fileId, accessTypeUint)` via Thirdweb SDK |
| tx hash | Real `transactionHash` from `waitForReceipt()` sent to backend |
| Error handling | If node unreachable / no doctor wallet / env var missing → **explicit destructive toast**: _"⚠️ Blockchain transaction failed — access recorded off-chain only"_ |
| Inline warnings | Shows amber banner when `EHR_ACCESS_ADDRESS` is not set; flags users with no linked wallet in the dropdown |
| User listing | Shows `⚠️ no wallet` indicator in dropdown for users missing `blockchainAddress` |

---

### `new_frontend/app/api/patient/access/grant/route.ts` _(MODIFIED — Phase 6)_

| Change | Detail |
|--------|--------|
| Removed | `blockchainTxHash: \`0x${Math.random()...}\`` dummy hash generation |
| Added | `blockchainTxHash` destructured from request body (default `null`) |
| Behavior | Stores real tx hash when provided; `undefined` when chain call was skipped |

---

### `new_frontend/app/api/patient/access/revoke/route.ts` _(MODIFIED — Phase 6)_

| Change | Detail |
|--------|--------|
| Removed | `blockchainTxHash: \`0x${Math.random()...}\`` dummy hash generation in audit log |
| Added | `blockchainTxHash` destructured from request body (default `null`) |
| Behavior | Stores real tx hash from `EHRAccess.revokeAccess()` when provided |

---

### `new_frontend/app/api/patient/records/[id]/route.ts` _(NEW — Phase 5 support)_

New `PATCH` endpoint that receives the blockchain result after the frontend completes the `registerFile()` call.

| Field | Detail |
|-------|--------|
| `fileId` | On-chain file ID extracted from `FileRegistered` event log |
| `transactionHash` | Full `0x...` Quorum transaction hash from the receipt |
| Auth | Validates that the record belongs to the authenticated patient before updating |

---

## Deployment Checklist

Before the blockchain features are functional:

1. **Deploy contracts** to local Hardhat node:
   ```bash
   cd blockchain
   npx hardhat node          # keep running in a terminal
   npx hardhat run scripts/deploy.js --network localhost
   ```

2. **Copy addresses** from the deploy output into `new_frontend/.env.local`:
   ```
   NEXT_PUBLIC_EHR_REGISTRY_ADDRESS=0x...
   NEXT_PUBLIC_EHR_ACCESS_ADDRESS=0x...
   ```

3. **Run the frontend**:
   ```bash
   cd new_frontend
   npm run dev
   ```

4. The app works **without** a running Hardhat node — IPFS uploads and MongoDB saves still function. Only `fileId` and `transactionHash` fields will be left as `null`/`"pending"` until the node is up.

---

## Backward Compatibility

- `/api/auth/login` and `/api/auth/register` routes are **unchanged** — admin login via email+password still works.
- All pre-existing MongoDB documents are unaffected; `blockchainTxHash` and `blockchainAddress` fields are optional/sparse.
