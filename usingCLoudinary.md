# Cloudinary Integration Plan

## Strategy: Dual Storage (Pinata + Cloudinary)

Every image is stored in **both** places for different purposes:

| Service | Purpose |
|---------|---------|
| **Pinata / IPFS** | Immutable proof of data — CID stored in DB, used for blockchain/trust verification |
| **Cloudinary** | Fast CDN delivery — URL stored in DB, used for all frontend display |

Users get fast image loads via Cloudinary, while Pinata guarantees the image is permanently anchored to an IPFS hash for verifiability.

---

## Upload Flow (What Changes)

Currently `/api/upload` only uploads to Pinata and returns a CID. It needs to also upload to Cloudinary and return a Cloudinary URL.

### New `/api/upload` behavior:
1. Receive file from frontend
2. Upload to **Pinata** → get `ipfsHash` (CID)
3. Upload to **Cloudinary** → get `cloudinaryUrl` (secure_url)
4. Return both: `{ cid, cloudinaryUrl }`

### What the frontend sends to the server (DB) after upload:
- For submissions: saves `imageCid` (existing) + `imageUrl` (new Cloudinary URL)
- For user avatars: saves `avatarUrl` as the Cloudinary URL (replaces current Pinata gateway URL)
- For events: saves `imageCid` (existing) + `imageUrl` (new Cloudinary URL)

---

## Database Changes Needed

### Schema changes (server/prisma/schema.prisma)

**`Submission` model** — add `imageUrl`:
```prisma
model Submission {
  ...
  imageCid   String?   // IPFS CID — immutable proof
  imageUrl   String?   // Cloudinary URL — fast display
  ...
}
```

**`Event` model** — add `imageUrl`:
```prisma
model Event {
  ...
  imageCid   String?   // IPFS CID — immutable proof
  imageUrl   String?   // Cloudinary URL — fast display
  ...
}
```

**`Brand` model** — add `logoUrl`:
```prisma
model Brand {
  ...
  logoCid    String?   // IPFS CID — immutable proof
  logoUrl    String?   // Cloudinary URL — fast display
  ...
}
```

**`User` model** — no new field needed. `avatarUrl` already exists as a full URL — we just switch it from storing the Pinata gateway URL to the Cloudinary URL.

### Migration required: YES
A Prisma migration is needed to add the three new fields (`imageUrl` on Submission, `imageUrl` on Event, `logoUrl` on Brand).

---

## Frontend Display Changes

All image display points switch from:
```
https://gateway.pinata.cloud/ipfs/{cid}
```
to using the stored Cloudinary URL directly. The helper `imgUrl(cid)` pattern gets replaced with the stored `imageUrl` field.

### Display priority logic (fallback for old records):
```ts
// Prefer Cloudinary URL, fall back to IPFS gateway if imageUrl not yet populated
const displayUrl = item.imageUrl ?? `https://gateway.pinata.cloud/ipfs/${item.imageCid}`;
```
This ensures old records without `imageUrl` still work during transition.

---

## Files That Need Changes

### Backend (server/)
| File | Change |
|------|--------|
| `server/prisma/schema.prisma` | Add `imageUrl` to Submission, Event; `logoUrl` to Brand |
| Server routes that create/update submissions | Accept and store `imageUrl` alongside `imageCid` |
| Server routes that create/update events | Accept and store `imageUrl` alongside `imageCid` |
| Server routes that update brand | Accept and store `logoUrl` alongside `logoCid` |

### Frontend (client/)
| File | Change |
|------|--------|
| `client/app/api/upload/route.ts` | Add Cloudinary upload after Pinata, return `cloudinaryUrl` |
| `client/lib/pinata-upload.ts` | Update return type to include `cloudinaryUrl` |
| `client/app/(user)/settings/page.tsx` | Use Cloudinary URL for `avatarUrl` (already stores full URL — just changes which URL) |
| `client/app/events/[id]/page.tsx` | Pass `imageUrl` when creating submission |
| `client/components/create/AIGeneratorWindow.tsx` | Pass `imageUrl` when posting AI-generated image |
| All display components (cards, event pages) | Use `imageUrl` field instead of building Pinata gateway URL from CID |

---

## Cloudinary Upload (Server-Side)

Cloudinary upload happens **server-side** in `/api/upload` using the Cloudinary Node SDK. The client never touches Cloudinary directly.

```ts
// In /api/upload/route.ts — after Pinata upload succeeds:
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Upload buffer to Cloudinary
const cloudinaryResult = await new Promise((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    { folder: 'aris/submissions', resource_type: 'image' },
    (err, result) => err ? reject(err) : resolve(result)
  );
  stream.end(fileBuffer);
});

const cloudinaryUrl = cloudinaryResult.secure_url;
```

Route response:
```json
{
  "success": true,
  "cid": "Qm...",
  "url": "https://gateway.pinata.cloud/ipfs/Qm...",
  "cloudinaryUrl": "https://res.cloudinary.com/..."
}
```

---

## Environment Variables (already present in .env.local)

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=...
NEXT_PUBLIC_CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

No new env vars needed — these are already configured.

---

## Migration Strategy for Existing Data

Existing DB records have `imageCid` but no `imageUrl`. Two options:

1. **Lazy migration** (recommended for now): Display falls back to Pinata gateway URL when `imageUrl` is null. New uploads populate both. Old records pick up Cloudinary URLs over time naturally.
2. **Backfill script** (later): Fetch all IPFS images → re-upload to Cloudinary → update DB. Run once after the integration is stable.

---

## Summary of Backend Work Required

| Task | Complexity |
|------|-----------|
| Prisma schema — add 3 fields + migrate | Low |
| Update submission create/update routes to accept `imageUrl` | Low |
| Update event create/update routes to accept `imageUrl` | Low |
| Update brand update routes to accept `logoUrl` | Low |
| `/api/upload` — add Cloudinary upload step | Medium |
| Frontend display — use `imageUrl` field instead of building CID URL | Low |

Backend changes are minimal — new optional fields and updated route handlers to persist them. No core logic changes on the server beyond accepting and storing the new URL field.
