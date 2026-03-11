# Cloud Storage Strategy — Pinata + CDN Layer

## Current Setup

All images (user submissions, AI-generated images, voting option media, sample images) are uploaded to **IPFS via Pinata**.

Flow currently:
- Client sends file to `/api/upload`
- Server uploads to Pinata using `PINATA_JWT`
- Pinata returns a CID (format: `Qm...` CIDv0)
- URL served back: `https://gateway.pinata.cloud/ipfs/{CID}`
- That CID is stored on-chain and used everywhere for display

The problem: **Pinata's public gateway is slow, rate-limited, and unreliable for end-user image loading.** IPFS is not a CDN — it was never designed for fast repeated reads.

---

## The Problem in Detail

- `gateway.pinata.cloud` is a shared public gateway — load times vary from 300ms to 8+ seconds
- No edge caching — every request may cold-fetch from IPFS nodes
- No image optimization (no WebP conversion, no resizing, no lazy loading support)
- No geographic distribution — users far from IPFS nodes get slow loads
- AI-generated images (base64 PNG from Imagen) are typically 1–4MB — painful over a slow gateway

---

## Recommended Solution: Keep Pinata + Add Cloudinary in Front

**Do not replace Pinata.** The CID is stored on-chain and is the canonical reference for the blockchain layer. What you add is a **fast delivery layer on top**.

### Why Cloudinary over AWS S3

| | Cloudinary | AWS S3 + CloudFront |
|---|---|---|
| Setup complexity | Low (one API key) | High (IAM, buckets, distributions, policies) |
| Image optimization | Built-in (WebP, resize, quality, format) | Requires Lambda@Edge or separate service |
| Free tier | 25GB storage + 25GB bandwidth/month | Pay from day 1 (small amounts but still) |
| Next.js integration | First-class (`next-cloudinary` package) | Manual |
| On-the-fly transforms | Yes (URL params) | No |
| Best for | Fast-moving product with image-heavy UI | High-volume enterprise storage |

For this project, **Cloudinary is the clear winner** — less ops overhead, image optimization out of the box, and free tier covers early-stage traffic easily.

---

## Proposed Architecture

```
User uploads / AI generates image
        |
        v
/api/upload  (Next.js route)
        |
   ┌────┴────┐
   |         |
   v         v
Pinata    Cloudinary
(IPFS)    (CDN layer)
   |         |
   v         v
CID stored  Cloudinary URL stored
on-chain    in your DB / returned to client
```

- **Pinata** remains the source of truth for the blockchain (CID is what the smart contract stores)
- **Cloudinary** serves the actual image to users — fast, optimized, cached at edge

The upload route uploads to both simultaneously. The CID goes on-chain. The Cloudinary URL is what the frontend `<img>` tags point to.

---

## What Changes in Code

### 1. Environment variables to add

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 2. `/api/upload` route

Currently only uploads to Pinata. Would need to:
- Also upload the same file to Cloudinary using their upload API
- Return both `cid` (for chain) and `cloudinaryUrl` (for display)
- Cloudinary upload can use the `fetch` method — you can even pass the Pinata gateway URL to Cloudinary and it fetches + caches it, avoiding double upload from your server

```
Cloudinary fetch approach:
POST https://api.cloudinary.com/v1_1/{cloud}/image/upload
  { file: "https://gateway.pinata.cloud/ipfs/{CID}", upload_preset: "..." }
```

This means: upload once to Pinata, get CID, then tell Cloudinary to fetch and cache that URL. Zero extra bandwidth from your server.

### 3. Image display components

Anywhere currently rendering:
```
https://gateway.pinata.cloud/ipfs/{CID}
```

Would instead use the stored Cloudinary URL, which auto-serves WebP, compressed, and edge-cached.

With `next-cloudinary`:
```tsx
import { CldImage } from 'next-cloudinary'
<CldImage src={cloudinaryPublicId} width={400} height={400} />
```

---

## Migration Path (Zero Breaking Changes)

Since the CID is what lives on-chain, you never need to migrate existing data. The approach is:

1. New uploads → dual write (Pinata + Cloudinary)
2. Store Cloudinary URL in your off-chain DB alongside the CID
3. UI reads Cloudinary URL for display, CID used only for chain verification
4. Old content already on Pinata can be lazily migrated by fetching through Cloudinary's `fetch` delivery type (Cloudinary caches any URL you point it at)

---

## Load Time Improvement Expected

| Scenario | Pinata gateway | Cloudinary CDN |
|---|---|---|
| First load (cold) | 2–8s | 200–600ms |
| Repeat load (cached) | 1–4s | 30–80ms (edge cache) |
| AI image (1–4MB PNG) | Slow, no optimization | Auto-converted to WebP ~200–400KB |
| Mobile user | No resize | Auto-resized to viewport |

---

## Summary

- **Keep Pinata** — it's the on-chain source of truth, don't touch the CID logic
- **Add Cloudinary** as the delivery layer — images displayed in UI come from Cloudinary
- Upload to Pinata first, then have Cloudinary fetch the Pinata URL (no extra server bandwidth)
- Use `next-cloudinary` for automatic WebP, resizing, and lazy loading in Next.js
- Free tier handles early-stage load comfortably
- AWS S3 + CloudFront would work too but requires significantly more setup and ops for the same result
