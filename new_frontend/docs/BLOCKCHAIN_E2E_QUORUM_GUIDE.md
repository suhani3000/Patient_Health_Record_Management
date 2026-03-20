# End-to-End Blockchain Integration Guide (Quorum + Patient-centric EHR)

This document explains how to complete an end-to-end “Patient-centric EHR with blockchain-powered access control + IPFS/Pinata file storage” integration for this project.

It focuses on:
- What exists today in this repo (current data flow and where blockchain is still “dummy”)
- Whether the current smart contracts match the project’s goals
- A step-by-step plan to make it work end-to-end

## 0) Current State (what’s already working)

### App backend (MongoDB + Next.js routes)
The working parts in `new_frontend` currently:
- Users register/login using MongoDB
- Patient can grant/revoke access to doctors/labs
- Patient/doctor/lab dashboards read access and medical records from MongoDB
- Files are uploaded to IPFS via Pinata using `new_frontend/lib/ipfs.ts`

### Blockchain is currently “dummy”
In the current routes (grant/revoke/upload), the app generates `blockchainTxHash` using random/mock values.
There is no on-chain call to:
- `EHRRegistry.registerFile`
- `EHRAccess.grantAccess`
- `EHRAccess.revokeAccess`

That’s expected right now and matches your note that blockchain integration couldn’t be completed.

## 1) Smart Contracts Review (do they match the app’s goals?)

In `blockchain/contracts/` there are two Solidity contracts:
- `EHRRegistry.sol`
- `EHRAccess.sol`

### `EHRRegistry.sol` behavior
- Maintains a per-patient file counter: `fileCounter[patient]`
- Stores a list of files per patient: `patientFiles[patient]`
- `registerFile(string category)`:
  - increments `fileCounter[msg.sender]`
  - pushes `FileMeta(fileId, category, block.timestamp)`
  - emits `FileRegistered(patient, fileId, category)`

### `EHRAccess.sol` behavior
- Stores permissions as:
  - `permissions[patient][doctor][fileId] => AccessType`
- `grantAccess(address doctor, uint256 fileId, AccessType access)`:
  - sets `permissions[msg.sender][doctor][fileId]`
  - emits `AccessGranted(patient, doctor, fileId, access)`
- `revokeAccess(address doctor, uint256 fileId)`:
  - sets `permissions[msg.sender][doctor][fileId] = AccessType.NONE`
  - emits `AccessRevoked(patient, doctor, fileId)`
- `checkAccess(address patient, address doctor, uint256 fileId)`

### Does this match the project’s “patient-centric EHR”?
Core idea: the contract design supports patient-granted access per file.

However, integration needs 3 important things from the app that are not present yet:

1. **Users must have blockchain addresses**
   - The contract uses `msg.sender` as the patient address.
   - Your Mongo users currently use Mongo `_id` (string/ObjectId).

2. **Files must have an on-chain `fileId`**
   - Your Mongo `medicalRecords` currently store IPFS `cid` (string) and other metadata.
   - The contract uses a numeric `fileId` from `EHRRegistry`.

3. **Your app must send real signed transactions**
   - `grantAccess` and `registerFile` require the patient to be the transaction sender.
   - A purely server-side mock can’t be truly “patient-centric” and won’t work like real access control unless patient signs.

## 2) Recommended Approach (keep contracts as-is)

Because the contracts already match the desired security model (patient owns permissions), the recommended approach is:

### Use the current contracts without changing them
Implement off-chain logic that:
- maps Mongo users to blockchain addresses
- registers files on-chain and stores the resulting `fileId` in Mongo
- uses real blockchain tx hashes (not random hashes)

This is “patient-centric” if patients sign transactions.

## 3) Data Model Changes (MongoDB)

You will need to extend Mongo documents to store blockchain-related fields.

### 3.1 Users: add a blockchain address
Add a new field on `users`:
- `blockchainAddress: string` (EVM address, e.g. `0xabc...`)

This is required because:
- the contracts store permissions keyed by patient address (`msg.sender`)

### 3.2 Medical Records: store the on-chain `fileId`
Extend `medicalRecords` with:
- `fileId: number` (uint256 mapped to JS number/string)
- `fileHash: string` (optional but recommended)
- `category: string` (contract `registerFile(string category)` uses category)

Current app stores:
- `cid` (string)
- `recordType` (string)

For integration:
- map `category = recordType` (or a normalized category)

## 4) Backend Integration: required blockchain calls

You will implement 3 on-chain actions and tie their outputs back into Mongo.

### 4.1 On file upload (patient upload flow)
When a patient uploads a new file:

1. Upload the file to IPFS (Pinata)
   - already implemented in `new_frontend/lib/ipfs.ts`
   - store `cid` in `medicalRecords`

2. Call `EHRRegistry.registerFile(category)` from the patient wallet
   - listen for the `FileRegistered(patient, fileId, category)` event
   - save `fileId` into the same Mongo record (or a new record placeholder updated after the tx)

3. Write a blockchain tx hash into Mongo
   - store tx hash into `medicalRecords.blockchainTxHash` (or `auditLogs.blockchainTxHash`)

### 4.2 On grant access
When a patient grants a doctor access:

1. Call `EHRAccess.grantAccess(doctorAddress, fileId, accessType)` from the patient wallet
2. Map your Mongo access level to contract enum:
   - Mongo `accessLevel: "view"` -> `AccessType.VIEW`
   - Mongo `accessLevel: "upload"` -> `AccessType.UPLOAD`
   - Mongo `accessLevel: "view-upload"` -> `AccessType.BOTH`
3. Save:
   - `blockchainTxHash` from the real tx receipt
   - `accessType` (optional, but good for UI)
   - `fileId` linkage in your permission record

### 4.3 On revoke access
When patient revokes:

1. Call `EHRAccess.revokeAccess(doctorAddress, fileId)` from the patient wallet
2. Save tx hash in `auditLogs.blockchainTxHash`
3. Update Mongo `accessPermissions.isActive = false`

## 5) Who signs transactions? (Patient-centric requirement)

### Option A (best for correctness): patient signs on the frontend
Flow:
- Patient connects wallet to your Quorum RPC endpoint
- Patient signs transactions for:
  - `registerFile`
  - `grantAccess`
  - `revokeAccess`

Backend becomes:
- verifier/persister (store tx hashes, events, and Mongo updates)

### Option B (not fully patient-centric): server/relayer signs as patient
This requires storing private keys on the server and using them to send txs.
It will “work”, but it’s less secure and contradicts patient-centric expectations.

## 6) Quorum Setup (local dev)

Quorum is EVM-compatible, so the integration flow stays the same as Ethereum-style RPC.

Step-by-step at a high level:

1. Start a local Quorum network (e.g., with geth IBFT or docker-based Quorum quickstart)
2. Configure Hardhat (or another deploy tool) to deploy `EHRRegistry` and `EHRAccess`
3. Store the deployed addresses in `new_frontend/.env.local`:
   - `EHR_REGISTRY_ADDRESS=...`
   - `EHR_ACCESS_ADDRESS=...`
   - `QUORUM_RPC_URL=...`
4. Ensure your accounts/wallets have funding and can sign transactions

## 7) Hardhat / Deploy Strategy

Contracts should be deployed once per chain.

Recommended:
- deploy `EHRRegistry` then `EHRAccess`
- record deployed addresses and deployment tx hashes

## 8) Contract/Model Mismatches to Resolve (if they block you)

### Mismatch 1: contract uses `fileId`, app uses `cid`
Recommended workflow is:
- Use `registerFile` to generate `fileId` and store it in Mongo
- Keep `cid` for storage + content addressing

### Mismatch 2: `registerFile` does not return the new `fileId`
`registerFile` emits an event.
So your backend/frontend integration must:
- read event logs from the tx receipt
- parse out `fileId`

If you want simpler integration, you can modify contracts to return `newFileId`,
but you asked not to change smart contracts in `blockchain/` right now.

### Mismatch 3: `grantAccess` uses `msg.sender` as patient
This is correct for patient-centric design, but it means patient must sign.

If you need a relayer pattern, you would:
- modify `EHRAccess` to accept a patient address parameter
- or add a trusted relayer role

## 9) IPFS / Pinata Implementation Notes (match current code)

This repo currently uploads using:
- `new_frontend/lib/ipfs.ts` -> `uploadFileToIPFS(buffer, fileName)`

Pinata secrets:
- `PINATA_JWT` must be server-side
- never expose `PINATA_SECRET_API_KEY` in the browser

Your current `lib/ipfs.ts` also has a dev/offline fallback:
- on `401/403` it returns a `mock_cid_*`
- so local UI remains usable

## 10) How to Make It Fully End-to-End (Phased checklist)

### Phase 1: keep current Mongo + UI working
- Ensure patient grant/revoke works in Mongo
- Ensure dashboards show names (no `Unknown`)

### Phase 2: add blockchainAddress to users
- add a UI step: patient enters/picks wallet address
- store it in Mongo `users.blockchainAddress`

### Phase 3: on upload, call EHRRegistry.registerFile
- upload to IPFS
- submit signed tx to Quorum
- parse `FileRegistered` event -> store `fileId` in Mongo

### Phase 4: on grant/revoke, call EHRAccess
- submit signed tx to Quorum
- parse `AccessGranted/AccessRevoked` events
- write real tx hashes into Mongo (`accessPermissions` and/or `auditLogs`)

### Phase 5: enforce access using blockchain verification (optional / advanced)
Two options:
- keep authorization in Mongo for UX, but verify on-demand with contract reads
- or fully rely on contract reads for access control

### Phase 6: add verification UX
- show blockchain audit trail by reading tx hashes

## 11) What I can implement next (if you want)

If you want me to proceed with implementation (not just documentation), I will:
1. Add Mongo fields (`blockchainAddress`, `fileId`, etc.)
2. Add blockchain client code (Ethers) + event parsing
3. Update the current grant/revoke/upload routes to call contracts and store tx hashes
4. Update the UI to request patient wallet signing when needed

## Appendix: Contract mapping (Mongo -> Solidity)

### AccessType mapping
- `"view"` -> `AccessType.VIEW`
- `"upload"` -> `AccessType.UPLOAD`
- `"view-upload"` -> `AccessType.BOTH`

### Category mapping
- Mongo `recordType` (or label) -> Solidity `category`

