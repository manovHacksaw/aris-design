import logger from '../lib/logger';
import { Response } from 'express';
import { ProposalService } from '../services/proposalService.js';
import { AuthenticatedRequest } from '../middlewares/authMiddleware.js';
import { prisma } from '../lib/prisma.js';

import { CreateProposalRequest, UpdateProposalRequest } from '../types/proposal.js';

async function getBrandByOwner(userId: string, res: Response) {
  const brand = await prisma.brand.findFirst({ where: { ownerId: userId }, select: { id: true } });
  if (!brand) { res.status(404).json({ success: false, error: 'Brand not found' }); return null; }
  return brand;
}

/**
 * Create a proposal for an event
 * POST /api/events/:eventId/proposals
 */
export const createProposal = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const userId = req.user?.id;
        const { eventId } = req.params;
        const data: CreateProposalRequest = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const brand = await getBrandByOwner(userId, res);
        if (!brand) return;

        const proposal = await ProposalService.createProposal(eventId, brand.id, data);

        res.status(201).json({
            success: true,
            message: 'Proposal created successfully',
            proposal,
        });
    } catch (error: any) {
        logger.error('Error in createProposal:', error);
        res.status(error.message.includes('Forbidden') ? 403 : 400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Update a proposal
 * PUT /api/proposals/:id
 */
export const updateProposal = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;
        const data: UpdateProposalRequest = req.body;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const brand = await getBrandByOwner(userId, res);
        if (!brand) return;

        const proposal = await ProposalService.updateProposal(id, brand.id, data);

        res.status(200).json({
            success: true,
            message: 'Proposal updated successfully',
            proposal,
        });
    } catch (error: any) {
        logger.error('Error in updateProposal:', error);
        res.status(error.message.includes('Forbidden') ? 403 : 400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Delete a proposal
 * DELETE /api/proposals/:id
 */
export const deleteProposal = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const userId = req.user?.id;
        const { id } = req.params;

        if (!userId) {
            return res.status(401).json({ success: false, error: 'Authentication required' });
        }

        const brand = await getBrandByOwner(userId, res);
        if (!brand) return;

        await ProposalService.deleteProposal(id, brand.id);

        res.status(200).json({
            success: true,
            message: 'Proposal deleted successfully',
        });
    } catch (error: any) {
        logger.error('Error in deleteProposal:', error);
        res.status(error.message.includes('Forbidden') ? 403 : 400).json({
            success: false,
            error: error.message,
        });
    }
};

/**
 * Get all proposals for an event
 * GET /api/events/:eventId/proposals
 */
export const getProposalsByEvent = async (req: AuthenticatedRequest, res: Response): Promise<Response | void> => {
    try {
        const { eventId } = req.params;
        const proposals = await ProposalService.getProposalsByEvent(eventId);

        res.status(200).json({
            success: true,
            proposals,
        });
    } catch (error: any) {
        logger.error('Error in getProposalsByEvent:', error);
        res.status(500).json({
            success: false,
            error: 'Internal server error',
        });
    }
};
