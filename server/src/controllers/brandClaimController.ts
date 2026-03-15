import { Request, Response } from 'express';
import { BrandClaimService } from '../services/brandClaimService';

/**
 * Validate claim token and return brand details
 * GET /api/brands/claim/:token
 * Public endpoint - no authentication required
 */
export const validateClaimToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { token } = req.params;

    if (!token) {
      res.status(400).json({
        success: false,
        error: 'Claim token is required',
      });
      return;
    }

    const brandDetails = await BrandClaimService.validateClaimToken(token);

    res.json({
      success: true,
      brand: {
        id: brandDetails.applicationId,
        name: brandDetails.brandName,
        tagline: brandDetails.tagline,
        description: brandDetails.description,
        categories: brandDetails.categories,
        brandOwnerEmail: brandDetails.brandOwnerEmail,
        companyName: brandDetails.companyName,
      },
    });
  } catch (error: any) {
    console.error('Error validating claim token:', error);

    if (error.message.includes('Invalid') || error.message.includes('expired') || error.message.includes('claimed')) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to validate claim token',
    });
  }
};

/**
 * Finalize brand claim by creating user and assigning ownership
 * POST /api/brands/claim
 * Public endpoint - no authentication required (creates new user)
 */
export const claimBrand = async (req: Request, res: Response): Promise<void> => {
  try {
    const { claimToken, email, walletAddress, displayName } = req.body;

    // Validate required fields
    if (!claimToken || !email || !walletAddress) {
      res.status(400).json({
        success: false,
        error: 'Claim token, email, and wallet address are required',
      });
      return;
    }

    // Claim the brand
    const result = await BrandClaimService.claimBrand({
      claimToken,
      email,
      walletAddress,
      displayName,
    });

    res.status(200).json({
      success: true,
      message: 'Brand claimed successfully',
      user: {
        id: result.user.id,
        email: result.user.email,
        displayName: result.user.displayName,
        walletAddress: result.user.walletAddress,
        role: result.user.role,
        isOnboarded: result.user.isOnboarded,
      },
      brand: {
        id: result.brand.id,
        name: result.brand.name,
        tagline: result.brand.tagline,
        description: result.brand.description,
        categories: result.brand.categories,
        isActive: result.brand.isActive,
      },
    });
  } catch (error: any) {
    console.error('Error claiming brand:', error);

    // Handle specific error cases
    if (error.message.includes('Invalid') ||
      error.message.includes('expired') ||
      error.message.includes('claimed') ||
      error.message.includes('required') ||
      error.message.includes('format') ||
      error.message.includes('match') ||
      error.message.includes('already owns')) {
      res.status(400).json({
        success: false,
        error: error.message,
      });
      return;
    }

    // Handle Prisma unique constraint errors
    if (error.code === 'P2002') {
      const field = error.meta?.target?.[0] || 'field';
      res.status(409).json({
        success: false,
        error: `This ${field} is already in use`,
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: 'Failed to claim brand. Please try again later.',
    });
  }
};
