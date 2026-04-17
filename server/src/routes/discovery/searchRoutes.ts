import { Router } from 'express';
import {
    searchUsers,
    searchBrands,
    searchEvents,
    searchAll,
    getUserByUsername,
    getBrandByIdentifier,
} from '../../controllers/discovery/searchController';
import { authenticateJWT } from '../../middlewares/authMiddleware';

const router = Router();

// All search routes require authentication
router.use(authenticateJWT);

/**
 * @route   GET /api/search/users
 * @desc    Search for users by username, display name, or email
 * @query   q - search term (required, min 2 chars)
 * @query   limit - max results to return (optional, default 10, max 50)
 * @access  Private
 */
router.get('/users', searchUsers);

/**
 * @route   GET /api/search/brands
 * @desc    Search for brands by name, tagline, description, or categories
 * @query   q - search term (required, min 2 chars)
 * @query   limit - max results to return (optional, default 10, max 50)
 * @access  Private
 */
router.get('/brands', searchBrands);

/**
 * @route   GET /api/search/events
 * @desc    Search for events by title
 * @query   q - search term (required, min 2 chars)
 * @query   limit - max results to return (optional, default 10, max 50)
 * @access  Private
 */
router.get('/events', searchEvents);

/**
 * @route   GET /api/search/all
 * @desc    Search for users, brands, and events
 * @query   q - search term (required, min 2 chars)
 * @query   limit - max results to return (optional, default 10, max 50)
 * @access  Private
 */
router.get('/all', searchAll);

/**
 * @route   GET /api/search/user/:username
 * @desc    Get user profile by username
 * @params  username - user's username
 * @access  Private
 */
router.get('/user/:username', getUserByUsername);

/**
 * @route   GET /api/search/brand/:identifier
 * @desc    Get brand by ID or name
 * @params  identifier - brand ID or name
 * @access  Private
 */
router.get('/brand/:identifier', getBrandByIdentifier);

export default router;
