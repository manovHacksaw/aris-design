import logger from '../../lib/logger';
import { Response } from 'express';
import { AuthenticatedRequest } from '../../middlewares/authMiddleware';
import { BrandXpService } from '../../services/brands/brandXpService';

import {
  BrandLevelStatusResponse,
  BrandDiscountResponse,
  BrandLevelHistoryResponse,
  RecalculateBrandLevelResponse,
} from '../../types/brandXp';

import { BrandService } from '../../services/brands/BrandService';

// Removed local getBrandForUser helper, using BrandService instead.

/**
 * Get brand's level status and progress
 * GET /api/brand-xp/status
 */
export const getBrandLevelStatus = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const brand = await BrandService.getBrandByOwnerId(userId);

    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found' });
    }

    const brandId = brand.id;

    const status = await BrandXpService.getBrandLevelStatus(brandId);

    const response: BrandLevelStatusResponse = {
      success: true,
      data: status,
    };

    res.status(200).json(response);
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error in getBrandLevelStatus:');
    res.status(500).json({
      success: false,
      error: 'Failed to get brand level status',
    });
  }
};

/**
 * Get brand's current discount percentage
 * GET /api/brand-xp/discount
 */
export const getBrandDiscount = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const brand = await BrandService.getBrandByOwnerId(userId);

    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found' });
    }

    const brandId = brand.id;

    const discountPercent = await BrandXpService.getBrandDiscount(brandId);

    const response: BrandDiscountResponse = {
      success: true,
      discountPercent,
    };

    res.status(200).json(response);
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error in getBrandDiscount:');
    res.status(500).json({
      success: false,
      error: 'Failed to get brand discount',
    });
  }
};

/**
 * Get brand's level change history
 * GET /api/brand-xp/history
 */
export const getBrandLevelHistory = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;
    const { limit = '20', offset = '0' } = req.query;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const brand = await BrandService.getBrandByOwnerId(userId);

    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found' });
    }

    const brandId = brand.id;
    const { snapshots, total } = await BrandXpService.getBrandLevelHistory(
      brandId,
      parseInt(limit as string, 10),
      parseInt(offset as string, 10)
    );

    const response: BrandLevelHistoryResponse = {
      success: true,
      snapshots,
      pagination: {
        total,
        limit: parseInt(limit as string, 10),
        offset: parseInt(offset as string, 10),
      },
    };

    res.status(200).json(response);
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error in getBrandLevelHistory:');
    res.status(500).json({
      success: false,
      error: 'Failed to get brand level history',
    });
  }
};

/**
 * Force recalculation of brand level
 * POST /api/brand-xp/recalculate
 */
export const recalculateBrandLevel = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const brand = await BrandService.getBrandByOwnerId(userId);

    if (!brand) {
      return res.status(404).json({ success: false, error: 'Brand not found' });
    }

    const brandId = brand.id;

    const result = await BrandXpService.recalculateBrandLevel(brandId, 'manual_recalc');

    const response: RecalculateBrandLevelResponse = {
      success: true,
      data: result,
    };

    res.status(200).json(response);
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error in recalculateBrandLevel:');
    res.status(500).json({
      success: false,
      error: 'Failed to recalculate brand level',
    });
  }
};

/**
 * Get level thresholds configuration
 * GET /api/brand-xp/thresholds
 */
export const getLevelThresholds = async (
  _req: AuthenticatedRequest,
  res: Response
): Promise<Response | void> => {
  try {
    const thresholds = BrandXpService.getLevelThresholds();

    res.status(200).json({
      success: true,
      thresholds,
    });
  } catch (error: unknown) {
    logger.error({ err: error }, 'Error in getLevelThresholds:');
    res.status(500).json({
      success: false,
      error: 'Failed to get level thresholds',
    });
  }
};
