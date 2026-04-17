import { Router } from "express";
import {
  getBrands,
  getUsers,
  getEvents,
  getContent,
} from "../../controllers/discovery/leaderboardController";

const router = Router();

/**
 * Leaderboard Routes
 * All endpoints are public (no authentication required)
 */

// GET /api/leaderboard/brands - Get brand leaderboard
router.get("/brands", getBrands);

// GET /api/leaderboard/users - Get user leaderboard
router.get("/users", getUsers);

// GET /api/leaderboard/events - Get event leaderboard
router.get("/events", getEvents);

// GET /api/leaderboard/content - Get content leaderboard
router.get("/content", getContent);

export default router;
