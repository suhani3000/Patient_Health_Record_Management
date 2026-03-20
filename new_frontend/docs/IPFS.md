# IPFS Integration (Pinata)

## Overview
The app uploads files to IPFS via Pinata from **server-side** code.

## Environment
Set `PINATA_JWT` in `new_frontend/.env.local` (server-side only) with pinning permissions.

## Current Helper
- `new_frontend/lib/ipfs.ts` -> `uploadFileToIPFS(buffer, fileName)` returning `{ cid, size }`

## Server usage

Import and call from an App Route or API route:

```ts
import { uploadFileToIPFS } from "@/lib/ipfs"

const buffer = Buffer.from(await file.arrayBuffer())
const ipfsResult = await uploadFileToIPFS(buffer, file.name)

// ipfsResult: { cid, size }
const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${ipfsResult.cid}`
```

## Dev/offline behavior
If Pinata upload fails with `401/403` (or you run non-production), the server falls back to a `mock_cid_*`
so your UI/routes remain usable during local development.

## Notes
Frontend direct-to-IPFS uploads are still not implemented by default (do not expose Pinata secrets in the browser).
