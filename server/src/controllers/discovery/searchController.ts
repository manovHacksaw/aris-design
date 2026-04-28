import logger from '../../lib/logger';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/authMiddleware';
import { SearchService } from '../../services/discovery/SearchService';
import { AppError } from '../../utils/errors';

const handle = (label: string) => (error: unknown, res: Response) => {
  if (error instanceof AppError) { res.status(error.status).json({ success: false, error: error.message }); return; }
  logger.error({ err: error }, label);
  res.status(500).json({ success: false, error: 'Internal server error' });
};

export const searchUsers = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const results = await SearchService.searchUsers(req.query.q, req.query.limit);
    res.json({ success: true, results, count: results.length });
  } catch (error) { handle('Error searching users:')(error, res); }
};

export const searchBrands = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const results = await SearchService.searchBrands(req.query.q, req.query.limit);
    res.json({ success: true, results, count: results.length });
  } catch (error) { handle('Error searching brands:')(error, res); }
};

export const searchEvents = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const results = await SearchService.searchEvents(req.query.q, req.query.limit);
    res.json({ success: true, results, count: results.length });
  } catch (error) { handle('Error searching events:')(error, res); }
};

export const searchAll = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const results = await SearchService.searchAll(req.query.q, req.query.limit);
    res.json({
      success: true,
      results,
      count: {
        users: results.users.length,
        brands: results.brands.length,
        events: results.events.length,
        total: results.users.length + results.brands.length + results.events.length,
      },
    });
  } catch (error) { handle('Error searching:')(error, res); }
};

export const getUserByUsername = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const user = await SearchService.getUserByUsername(req.params.username);
    res.json({ success: true, user });
  } catch (error) { handle('Error fetching user by username:')(error, res); }
};

export const getBrandByIdentifier = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const brand = await SearchService.getBrandByIdentifier(req.params.identifier);
    res.json({ success: true, brand });
  } catch (error) { handle('Error fetching brand:')(error, res); }
};
