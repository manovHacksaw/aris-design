# IPFS/Pinata Optimization Guide

## Quick Wins (Do These First!)

### 1. Switch to Pinata Dedicated Gateway ⚡ **Immediate 2-3x speedup**

Update your `.env`:
```bash
PINATA_GATEWAY="https://gateway.pinata.cloud"
```

**Before:** `https://ipfs.io/ipfs/QmXXX` (slow, public gateway)
**After:** `https://gateway.pinata.cloud/ipfs/QmXXX` (fast, dedicated)

### 2. Add HTTP Cache Headers ⚡ **Free browser/CDN caching**

```typescript
// IPFS content is immutable - cache aggressively!
res.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year
```

### 3. Use the IPFS Service

```typescript
import { addImageUrls } from './services/ipfsService';

const events = await prisma.event.findMany();
const optimized = events.map(event => addImageUrls(event));

// Returns events with imageUrls: { thumbnail, medium, large, full }
```

---

## Performance Comparison

| Method | Speed | Notes |
|--------|-------|-------|
| `ipfs.io` gateway | 🐌 3-8s | Public, overloaded |
| `gateway.pinata.cloud` | ⚡ 0.5-2s | Dedicated gateway |
| Custom Pinata subdomain | 🚀 0.3-1s | Requires paid plan |
| With CDN (Cloudflare) | 🚀 0.1-0.5s | Best option |

---

## Implementation Steps

### Step 1: Update Environment Variables

Add to `.env`:
```bash
PINATA_API_KEY="your-api-key"
PINATA_SECRET_KEY="your-secret-key"
PINATA_GATEWAY="https://gateway.pinata.cloud"
```

### Step 2: Use the IPFS Service

The service is already created at `src/services/ipfsService.ts`.

**Example usage in your event controller:**

```typescript
import { addImageUrls, addBrandLogoUrls } from '../services/ipfsService';

export async function getEvents(req, res) {
  const events = await prisma.event.findMany({
    include: { brand: true }
  });

  const optimized = events.map(event => ({
    ...addImageUrls(event),
    brand: addBrandLogoUrls(event.brand),
  }));

  res.json(optimized);
}
```

**Response format:**
```json
{
  "id": "event-123",
  "title": "Amazing Event",
  "imageUrls": {
    "thumbnail": "https://gateway.pinata.cloud/ipfs/QmXXX",
    "medium": "https://gateway.pinata.cloud/ipfs/QmXXX",
    "large": "https://gateway.pinata.cloud/ipfs/QmXXX",
    "full": "https://gateway.pinata.cloud/ipfs/QmXXX"
  }
}
```

### Step 3: Add Cache Middleware

```typescript
import { getIPFSCacheHeaders } from '../services/ipfsService';

app.use('/api/events', (req, res, next) => {
  const headers = getIPFSCacheHeaders();
  Object.entries(headers).forEach(([key, value]) => res.set(key, value));
  next();
});
```

---

## Advanced Optimizations

### Option A: Add CDN (Cloudflare) - **Recommended**

1. Sign up for Cloudflare (free plan works)
2. Point your domain through Cloudflare
3. Enable "Cache Everything" page rule for `/ipfs/*`
4. Update your gateway URL to use your domain

**Result:** Images cached globally, ~100ms response time

### Option B: Upload Multiple Sizes

When uploading to Pinata, create thumbnails:

```bash
npm install sharp
```

```typescript
import sharp from 'sharp';

async function uploadWithThumbnails(file: Buffer) {
  // Thumbnail (300px)
  const thumb = await sharp(file)
    .resize(300, 300, { fit: 'inside' })
    .jpeg({ quality: 75 })
    .toBuffer();

  // Upload both
  const [thumbCid, fullCid] = await Promise.all([
    pinata.pinFileToIPFS(thumb),
    pinata.pinFileToIPFS(file),
  ]);

  return {
    thumbnailCid: thumbCid.IpfsHash,
    imageCid: fullCid.IpfsHash,
  };
}
```

Then update your schema:
```prisma
model Event {
  imageCid      String?
  thumbnailCid  String?
}
```

### Option C: Add Redis Cache

```bash
npm install ioredis
```

```typescript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL);

async function getCachedImageUrl(cid: string) {
  const cached = await redis.get(`ipfs:${cid}`);
  if (cached) return cached;

  const url = `https://gateway.pinata.cloud/ipfs/${cid}`;
  await redis.setex(`ipfs:${cid}`, 604800, url); // 7 days

  return url;
}
```

---

## Frontend Integration

### Progressive Image Loading

```typescript
// API returns all sizes
{
  "imageUrls": {
    "thumbnail": "...",  // Load first (fast)
    "medium": "...",     // Load when in view
    "full": "..."        // Load on click/zoom
  }
}
```

### React Example

```jsx
function EventImage({ imageUrls }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div>
      {/* Show thumbnail immediately */}
      <img
        src={imageUrls.thumbnail}
        style={{ filter: loaded ? 'none' : 'blur(10px)' }}
      />

      {/* Load full image in background */}
      <img
        src={imageUrls.medium}
        onLoad={() => setLoaded(true)}
        style={{ display: loaded ? 'block' : 'none' }}
      />
    </div>
  );
}
```

---

## Monitoring Performance

### Track Image Load Times

```typescript
// In your API
console.time('ipfs-fetch');
const url = getIPFSUrl(cid);
console.timeEnd('ipfs-fetch');
```

### Pinata Analytics

Check your Pinata dashboard for:
- Gateway bandwidth usage
- Request counts
- Geographic distribution

---

## Cost Considerations

| Option | Cost | Performance | Complexity |
|--------|------|-------------|------------|
| Public gateway | Free | Slow | None |
| Pinata gateway | Free (100GB/mo) | Fast | Low |
| Custom subdomain | $20/mo | Faster | Low |
| Cloudflare CDN | Free | Fastest | Medium |
| Multiple sizes | Storage cost | Fastest | Medium |

---

## Troubleshooting

### Images still loading slowly?

1. Check which gateway you're using:
   ```bash
   echo $PINATA_GATEWAY
   ```

2. Test gateway speed:
   ```bash
   curl -w "@curl-format.txt" https://gateway.pinata.cloud/ipfs/QmYOUR_CID
   ```

3. Verify cache headers:
   ```bash
   curl -I https://your-api.com/api/events/123
   ```

### Rate limiting?

Pinata free tier limits:
- 100 requests/second
- 100GB bandwidth/month

**Solution:** Add Cloudflare CDN to cache responses

---

## Next Steps

1. ✅ Update `.env` with Pinata gateway
2. ✅ Use `ipfsService` in your event/submission APIs
3. ✅ Add cache headers to responses
4. ⏭️ Consider adding Cloudflare CDN (optional but recommended)
5. ⏭️ Upload thumbnails for faster initial loads (optional)

---

## Resources

- [Pinata Documentation](https://docs.pinata.cloud/)
- [IPFS Gateway Checker](https://ipfs.github.io/public-gateway-checker/)
- [Cloudflare Image Resizing](https://developers.cloudflare.com/images/)
- Example code: `src/examples/ipfsOptimizationExample.ts`
