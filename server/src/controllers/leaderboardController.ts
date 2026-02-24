import { Request, Response } from "express";
import {
  getBrandLeaderboard,
  getUserLeaderboard,
  getEventLeaderboard,
  getContentLeaderboard,
} from "../services/leaderboardService";

/**
 * Get brand leaderboard
 * Ranks brands by participants and ART minted
 */
export async function getBrands(req: Request, res: Response) {
  try {
    const leaderboard = await getBrandLeaderboard();
    res.json({
      success: true,
      data: leaderboard,
      total: leaderboard.length,
    });
  } catch (error) {
    console.error("Error fetching brand leaderboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch brand leaderboard",
    });
  }
}

/**
 * Get user leaderboard
 * Ranks users by votes cast and votes received
 */
export async function getUsers(req: Request, res: Response) {
  try {
    const leaderboard = await getUserLeaderboard();
    res.json({
      success: true,
      data: leaderboard,
      total: leaderboard.length,
    });
  } catch (error) {
    console.error("Error fetching user leaderboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user leaderboard",
    });
  }
}

/**
 * Get event leaderboard
 * Ranks events by participants and ART minted
 */
export async function getEvents(req: Request, res: Response) {
  try {
    const leaderboard = await getEventLeaderboard();
    res.json({
      success: true,
      data: leaderboard,
      total: leaderboard.length,
    });
  } catch (error) {
    console.error("Error fetching event leaderboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch event leaderboard",
    });
  }
}

/**
 * Get content leaderboard
 * Ranks submissions by votes received
 */
export async function getContent(req: Request, res: Response) {
  try {
    const leaderboard = await getContentLeaderboard();
    res.json({
      success: true,
      data: leaderboard,
      total: leaderboard.length,
    });
  } catch (error) {
    console.error("Error fetching content leaderboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch content leaderboard",
    });
  }
}
