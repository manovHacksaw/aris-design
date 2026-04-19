import logger from '../../lib/logger.js';
import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/authMiddleware.js';
import { BrandQueryService } from '../../services/brands/BrandQueryService.js';
import { BrandMutationService } from '../../services/brands/BrandMutationService.js';
import { AppError } from '../../utils/errors.js';

export const getCurrentBrand = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    const brand = await BrandQueryService.getByOwner(userId);
    res.json(brand);
  } catch (error) {
    if (error instanceof AppError) { res.status(error.status).json({ success: false, error: error.message }); return; }
    logger.error({ err: error }, 'Error fetching current brand:');
    res.status(500).json({ success: false, error: 'Failed to fetch brand details' });
  }
};

export const upsertBrandProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  const userId = req.user?.id;
  const { name, tagline, description, logoCid, categories, socialLinks } = req.body;

  try {
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    const brand = await BrandMutationService.upsert(userId, { name, tagline, description, logoCid, categories, socialLinks });
    res.json({ success: true, brand });
  } catch (error: any) {
    if (error instanceof AppError) { res.status(error.status).json({ success: false, error: error.message }); return; }
    if (error.code === 'P2002') {
      try {
        const brand = await BrandMutationService.handleDuplicateName(name, userId!);
        res.json({ success: true, brand });
      } catch (inner: any) {
        if (inner instanceof AppError) { res.status(inner.status).json({ success: false, error: inner.message }); return; }
        res.status(500).json({ success: false, error: 'Failed to update brand profile' });
      }
      return;
    }
    logger.error({ err: error }, 'Error upserting brand profile:');
    res.status(500).json({ success: false, error: error.message || 'Failed to update brand profile' });
  }
};

export const updatePersonalDiscount = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    const result = await BrandQueryService.getMilestones(userId);
    res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof AppError) { res.status(error.status).json({ success: false, error: error.message }); return; }
    logger.error({ err: error }, 'Error updating personal discount:');
    res.status(500).json({ success: false, error: 'Failed to update personal discount' });
  }
};

export const getBrandMilestones = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    if (!userId) { res.status(401).json({ success: false, error: 'Unauthorized' }); return; }

    const result = await BrandQueryService.getMilestones(userId);
    res.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof AppError) { res.status(error.status).json({ success: false, error: error.message }); return; }
    logger.error({ err: error }, 'Error fetching brand milestones:');
    res.status(500).json({ success: false, error: 'Failed to fetch brand milestones' });
  }
};

export const getPublicBrandProfile = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { identifier } = req.params;
    if (!identifier) { res.status(400).json({ success: false, error: 'Identifier is required' }); return; }

    const brand = await BrandQueryService.getPublicProfile(identifier, req.user?.id);
    res.json(brand);
  } catch (error) {
    if (error instanceof AppError) { res.status(error.status).json({ success: false, error: error.message }); return; }
    logger.error({ err: error }, 'Error fetching public brand profile:');
    res.status(500).json({ success: false, error: 'Failed to fetch brand profile' });
  }
};
