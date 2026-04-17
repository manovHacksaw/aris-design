import { getIPFSUrl } from '../ipfsService.js';

export class SubmissionUtils {
  /**
   * Validate IPFS CID format
   */
  static validateImageCid(imageCid: string): void {
    if (!/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{50,})$/.test(imageCid)) {
      throw new Error('Invalid IPFS CID format');
    }
  }

  /**
   * Transform submission with optimized IPFS image URLs
   */
  static addImageUrls(submission: any): any {
    if (!submission) return submission;

    const transformed = { ...submission };

    // Prefer Cloudinary imageUrl; fall back to IPFS CID
    if (submission.imageUrl) {
      transformed.imageUrls = {
        thumbnail: submission.imageUrl,
        medium: submission.imageUrl,
        large: submission.imageUrl,
        full: submission.imageUrl,
      };
    } else if (submission.imageCid) {
      transformed.imageUrls = {
        thumbnail: getIPFSUrl(submission.imageCid, 'thumbnail'),
        medium: getIPFSUrl(submission.imageCid, 'medium'),
        large: getIPFSUrl(submission.imageCid, 'large'),
        full: getIPFSUrl(submission.imageCid, 'full'),
      };
    }

    // Add user avatar URL if user is included
    if (submission.user?.avatarUrl) {
      transformed.user = {
        ...submission.user,
        avatarUrlFull: submission.user.avatarUrl,
      };
    }

    return transformed;
  }
}
