# IPFS Integration (Pinata)

Overview
- The project uses Pinata for IPFS pinning from server-side API routes.

Environment
- Set `PINATA_JWT` in your environment (server) with a Pinata JWT that has pinning permissions.

Helpers
- `lib/ipfs/pinata.ts` — low-level upload helper used by API routes.
- `lib/ipfs/index.ts` — convenience wrapper that re-exports `uploadToPinata`, provides `uploadJSONToPinata`, and `cidToGatewayUrl`.

Server usage (example)

Import and call from an App Route or API route:

```ts
import { uploadToPinata } from "@/lib/ipfs/pinata"

const result = await uploadToPinata(file)
// result: { cid, url }
```

Notes
- Frontend direct-to-IPFS uploads are not implemented by default. If you want client-side uploads, add a provider such as `ipfs-http-client` or `web3.storage` and follow their browser examples. Remember to avoid exposing secret keys in the browser.
