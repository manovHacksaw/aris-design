/**
 * Example: How to use the IPFS optimization service
 *
 * This file shows how to integrate the ipfsService into your existing APIs
 */

import { addImageUrls, addBrandLogoUrls, addSubmissionImageUrls } from '../services/ipfsService';
import { prisma } from '../lib/prisma';

// ============================================================================
// EXAMPLE 1: Optimize Event List API
// ============================================================================

export async function getEventsOptimized() {
  const events = await prisma.event.findMany({
    select: {
      id: true,
      title: true,
      description: true,
      status: true,
      startTime: true,
      endTime: true,
      imageCid: true, // Only fetch CID, not full URL
      brandId: true,
      brand: {
        select: {
          id: true,
          name: true,
          logoCid: true,
        },
      },
    },
    take: 20,
  });

  // Transform events to include optimized image URLs
  return events.map(event => ({
    ...addImageUrls(event),
    brand: event.brand ? addBrandLogoUrls(event.brand) : null,
  }));
}

// Response will look like:
// {
//   id: "...",
//   title: "...",
//   imageUrls: {
//     thumbnail: "https://gateway.pinata.cloud/ipfs/QmXXX",
//     medium: "https://gateway.pinata.cloud/ipfs/QmXXX",
//     large: "https://gateway.pinata.cloud/ipfs/QmXXX",
//     full: "https://gateway.pinata.cloud/ipfs/QmXXX"
//   },
//   brand: {
//     name: "...",
//     logoUrls: {
//       thumbnail: "...",
//       medium: "...",
//       full: "..."
//     }
//   }
// }

// ============================================================================
// EXAMPLE 2: Optimize Submissions API
// ============================================================================

export async function getSubmissionsOptimized(eventId: string) {
  const submissions = await prisma.submission.findMany({
    where: { eventId },
    select: {
      id: true,
      caption: true,
      imageCid: true,
      voteCount: true,
      createdAt: true,
      user: {
        select: {
          id: true,
          username: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
    orderBy: { voteCount: 'desc' },
    take: 50,
  });

  return submissions.map(submission => ({
    ...addSubmissionImageUrls(submission),
    user: submission.user,
  }));
}

// ============================================================================
// EXAMPLE 3: Add Cache Headers Middleware
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import { getIPFSCacheHeaders } from '../services/ipfsService';

export function ipfsCacheMiddleware(req: Request, res: Response, next: NextFunction) {
  // Apply cache headers for any routes serving IPFS content
  const headers = getIPFSCacheHeaders();
  Object.entries(headers).forEach(([key, value]) => {
    res.set(key, value);
  });
  next();
}

// Usage in routes:
// app.get('/api/events', ipfsCacheMiddleware, getEventsController);

// ============================================================================
// EXAMPLE 4: Parallel Image Prefetching
// ============================================================================

import { prefetchIPFSUrls } from '../services/ipfsService';

export async function getEventWithPrefetch(eventId: string) {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      submissions: {
        select: { imageCid: true },
        take: 10,
      },
      proposals: {
        select: { imageCid: true },
      },
    },
  });

  if (!event) return null;

  // Get all image CIDs
  const imageCids = [
    event.imageCid,
    ...event.submissions.map(s => s.imageCid),
    ...event.proposals.map(p => p.imageCid),
  ];

  // Generate prefetch URLs (client can start loading these in parallel)
  const prefetchUrls = prefetchIPFSUrls(imageCids, 'medium');

  return {
    ...addImageUrls(event),
    prefetchUrls, // Send these to client for parallel loading
  };
}

// ============================================================================
// EXAMPLE 5: Direct IPFS Proxy (for extra caching)
// ============================================================================

import { Router } from 'express';
import axios from 'axios';

const router = Router();

// Create a caching proxy endpoint
router.get('/ipfs/:cid', async (req, res) => {
  try {
    const { cid } = req.params;
    const gateway = process.env.PINATA_GATEWAY || 'https://gateway.pinata.cloud';

    // Fetch from Pinata
    const response = await axios.get(`${gateway}/ipfs/${cid}`, {
      responseType: 'arraybuffer',
      timeout: 10000,
    });

    // Set aggressive cache headers (IPFS is immutable)
    res.set('Content-Type', response.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=31536000, immutable');
    res.set('CDN-Cache-Control', 'public, max-age=31536000');

    res.send(response.data);
  } catch (error) {
    console.error('IPFS fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch from IPFS' });
  }
});

export const ipfsProxyRouter = router;

// Usage in main app:
// app.use('/api', ipfsProxyRouter);

// ============================================================================
// EXAMPLE 6: Integration with existing eventService
// ============================================================================

// In your eventService.ts, you can add this transform function:

export function transformEventResponse(event: any) {
  return {
    ...event,
    // Add optimized image URLs
    ...(event.imageCid && {
      imageUrls: {
        thumbnail: `${process.env.PINATA_GATEWAY}/ipfs/${event.imageCid}?w=300`,
        medium: `${process.env.PINATA_GATEWAY}/ipfs/${event.imageCid}?w=800`,
        full: `${process.env.PINATA_GATEWAY}/ipfs/${event.imageCid}`,
      },
    }),
    // Transform nested brand
    brand: event.brand ? {
      ...event.brand,
      ...(event.brand.logoCid && {
        logoUrls: {
          thumbnail: `${process.env.PINATA_GATEWAY}/ipfs/${event.brand.logoCid}?w=300`,
          medium: `${process.env.PINATA_GATEWAY}/ipfs/${event.brand.logoCid}?w=600`,
          full: `${process.env.PINATA_GATEWAY}/ipfs/${event.brand.logoCid}`,
        },
      }),
    } : null,
  };
}
