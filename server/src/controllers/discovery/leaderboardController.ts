import logger from '../../lib/logger';
import { Request, Response } from "express";
import {
  getBrandLeaderboard,
  getUserLeaderboard,
  getEventLeaderboard,
  getContentLeaderboard,
} from "../../services/events/leaderboardService";

/**
 * Get brand leaderboard
 * Ranks brands by participants and ART minted
 */
export async function getBrands(req: Request, res: Response) {
  try {
    const period = (req.query.period as string) || "A";
    const leaderboard = await getBrandLeaderboard(period);
    res.json({ success: true, data: leaderboard, total: leaderboard.length });
  } catch (error) {
    logger.error({ err: error }, "Error fetching brand leaderboard:");
    res.status(500).json({ success: false, message: "Failed to fetch brand leaderboard" });
  }
}

export async function getUsers(req: Request, res: Response) {
  try {
    const period = (req.query.period as string) || "A";
    const leaderboard = await getUserLeaderboard(period);
    res.json({ success: true, data: leaderboard, total: leaderboard.length });
  } catch (error) {
    logger.error({ err: error }, "Error fetching user leaderboard:");
    res.status(500).json({ success: false, message: "Failed to fetch user leaderboard" });
  }
}

export async function getEvents(req: Request, res: Response) {
  try {
    const period = (req.query.period as string) || "A";
    const leaderboard = await getEventLeaderboard(period);
    res.json({ success: true, data: leaderboard, total: leaderboard.length });
  } catch (error) {
    logger.error({ err: error }, "Error fetching event leaderboard:");
    res.status(500).json({ success: false, message: "Failed to fetch event leaderboard" });
  }
}

/**
 * Get content leaderboard
 * Ranks submissions by votes received
 */
export async function getContent(_req: Request, res: Response) {
  try {
    const leaderboard = await getContentLeaderboard();
    res.json({
      success: true,
      data: leaderboard,
      total: leaderboard.length,
    });
  } catch (error) {
    logger.error({ err: error }, "Error fetching content leaderboard:");
    res.status(500).json({
      success: false,
      message: "Failed to fetch content leaderboard",
    });
  }
}
