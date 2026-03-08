/**
 * IPFS/Pinata Service
 * Optimized image fetching and caching
 */

// Image size configurations
export const IMAGE_SIZES = {
  thumbnail: { width: 300, quality: 75 },
  medium: { width: 800, quality: 85 },
  large: { width: 1200, quality: 90 },
  full: { width: null, quality: 95 },
} as const;

type ImageSize = keyof typeof IMAGE_SIZES;

/**
 * Get optimized IPFS URL using Pinata's dedicated gateway
 *
 * @param cid - IPFS Content Identifier
 * @param size - Image size variant (thumbnail, medium, large, full)
 * @returns Optimized image URL
 */
export function getIPFSUrl(cid: string | null | undefined, size: ImageSize = 'full'): string | null {
  if (!cid) return null;

  // Use Pinata's dedicated gateway (much faster than ipfs.io)
  const gateway = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud';
  const baseUrl = `${gateway}/ipfs/${cid}`;

  // If you have Cloudflare Image Resizing, use it for optimization
  if (process.env.CLOUDFLARE_IMAGE_RESIZE_ENABLED === 'true') {
    const config = IMAGE_SIZES[size];
    if (config.width) {
      return `https://your-domain.com/cdn-cgi/image/width=${config.width},quality=${config.quality},format=auto/${baseUrl}`;
    }
  }

  return baseUrl;
}

/**
 * Transform event with optimized image URLs
 */
export function addImageUrls<T extends { imageCid?: string | null }>(item: T) {
  if (!item.imageCid) return item;

  return {
    ...item,
    imageUrls: {
      thumbnail: getIPFSUrl(item.imageCid, 'thumbnail'),
      medium: getIPFSUrl(item.imageCid, 'medium'),
      large: getIPFSUrl(item.imageCid, 'large'),
      full: getIPFSUrl(item.imageCid, 'full'),
    },
  };
}

/**
 * Transform submission with optimized image URLs
 */
export function addSubmissionImageUrls<T extends { imageCid?: string | null }>(item: T) {
  return addImageUrls(item);
}

/**
 * Transform brand with optimized logo URLs
 */
export function addBrandLogoUrls<T extends { logoCid?: string | null }>(brand: T) {
  if (!brand.logoCid) return brand;

  return {
    ...brand,
    logoUrls: {
      thumbnail: getIPFSUrl(brand.logoCid, 'thumbnail'),
      medium: getIPFSUrl(brand.logoCid, 'medium'),
      full: getIPFSUrl(brand.logoCid, 'full'),
    },
  };
}

/**
 * Transform proposal with optimized image URLs
 */
export function addProposalImageUrls<T extends { imageCid?: string | null }>(proposal: T) {
  return addImageUrls(proposal);
}

/**
 * Get cache headers for IPFS content
 * IPFS content is immutable, so we can cache aggressively
 */
export function getIPFSCacheHeaders() {
  return {
    'Cache-Control': 'public, max-age=31536000, immutable', // 1 year
    'CDN-Cache-Control': 'public, max-age=31536000',
  };
}

/**
 * Prefetch multiple IPFS URLs (useful for batch operations)
 * Returns URLs that can be sent to client for parallel loading
 */
export function prefetchIPFSUrls(cids: (string | null | undefined)[], size: ImageSize = 'medium'): string[] {
  return cids
    .filter((cid): cid is string => !!cid)
    .map(cid => getIPFSUrl(cid, size))
    .filter((url): url is string => !!url);
}
