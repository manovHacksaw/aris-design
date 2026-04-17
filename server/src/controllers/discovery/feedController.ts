import logger from '../../lib/logger';
import { Request, Response } from "express";
import { HomeService } from "../../services/discovery/homeService.js";

/**
 * Get personalized Home event feed
 */
export async function getHomeEvents(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const feed = await HomeService.getHomeFeed(userId);
    res.json({ success: true, data: feed });
  } catch (error) {
    logger.error("Error fetching home event feed:", error);
    res.status(500).json({ success: false, message: "Failed to fetch home event feed" });
  }
}

/**
 * Get personalized Home content feed
 */
export async function getHomeContent(req: Request, res: Response) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "User not authenticated" });
    }

    const content = await HomeService.getHomeContent(userId);
    res.json({ success: true, data: content });
  } catch (error) {
    logger.error("Error fetching home content feed:", error);
    res.status(500).json({ success: false, message: "Failed to fetch home content feed" });
  }
}
