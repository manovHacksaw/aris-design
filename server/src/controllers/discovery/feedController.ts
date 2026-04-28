import logger from '../../lib/logger';
import { Response } from "express";
import { HomeService } from "../../services/discovery/homeService";
import { AuthenticatedRequest } from "../../middlewares/authMiddleware";

/**
 * Get personalized Home event feed
 */
export async function getHomeEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "User not authenticated" });
      return;
    }

    const feed = await HomeService.getHomeFeed(userId);
    res.json({ success: true, data: feed });
  } catch (error) {
    logger.error({ err: error }, "Error fetching home event feed:");
    res.status(500).json({ success: false, message: "Failed to fetch home event feed" });
  }
}

/**
 * Get personalized Home content feed
 */
export async function getHomeContent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ success: false, message: "User not authenticated" });
      return;
    }

    const content = await HomeService.getHomeContent(userId);
    res.json({ success: true, data: content });
  } catch (error) {
    logger.error({ err: error }, "Error fetching home content feed:");
    res.status(500).json({ success: false, message: "Failed to fetch home content feed" });
  }
}
