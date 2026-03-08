import { prisma } from '../lib/prisma.js';
import { Proposal, ProposalType } from '@prisma/client';
import {
  CreateProposalRequest,
  UpdateProposalRequest,
} from '../types/proposal.js';
import { EventStatus } from '../types/event.js';

export class ProposalService {
  /**
   * Validate proposal data based on type
   */
  private static validateProposalData(data: CreateProposalRequest | UpdateProposalRequest): void {
    if ('type' in data) {
      // For create requests
      if (data.type === 'IMAGE') {
        if (!data.imageCid) {
          throw new Error('IMAGE proposals require imageCid');
        }
        // Validate IPFS CID format
        if (!/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{50,})$/.test(data.imageCid)) {
          throw new Error('Invalid IPFS CID format');
        }
      } else if (data.type === 'TEXT') {
        // TEXT proposals should have content (the question/description)
        // But it's optional in case brand wants a simple text vote option
      }
    }

    // Title is required for all proposals
    if ('title' in data && data.title && data.title.trim().length === 0) {
      throw new Error('Proposal title cannot be empty');
    }
  }

  /**
   * Create a proposal for an event
   */
  static async createProposal(
    eventId: string,
    brandId: string,
    data: CreateProposalRequest
  ): Promise<Proposal> {
    // 1. Fetch event with brand info
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        proposals: true,
      },
    });

    if (!event) {
      throw new Error('Event not found');
    }

    if (event.isDeleted) {
      throw new Error('Event not found');
    }

    // 2. Ownership check
    if (event.brandId !== brandId) {
      throw new Error('Forbidden: You do not own this event');
    }

    // 3. Proposals only for VOTE_ONLY events
    if (event.eventType !== 'vote_only') {
      throw new Error('Proposals are only allowed for VOTE_ONLY events');
    }

    // 4. Can only add/edit proposals in DRAFT or SCHEDULED state
    if (![EventStatus.DRAFT, EventStatus.SCHEDULED].includes(event.status as any)) {
      throw new Error('Cannot add proposals after event has started');
    }

    // 5. Check maximum proposals limit (10 for vote-only events)
    if (event.proposals.length >= 10) {
      throw new Error('Vote only events can have at most 10 proposals');
    }

    // 6. Validate proposal data
    this.validateProposalData(data);

    // 6. Create proposal
    return prisma.proposal.create({
      data: {
        eventId,
        type: data.type,
        title: data.title,
        content: data.content || null,
        imageCid: data.imageCid || null,
        order: data.order ?? event.proposals.length, // Default to end of list
      },
    });
  }

  /**
   * Update a proposal
   */
  static async updateProposal(
    proposalId: string,
    brandId: string,
    data: UpdateProposalRequest
  ): Promise<Proposal> {
    // 1. Fetch proposal with event
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { event: true },
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    // 2. Ownership check
    if (proposal.event.brandId !== brandId) {
      throw new Error('Forbidden: You do not own this proposal');
    }

    // 3. Can only edit in DRAFT or SCHEDULED
    if (![EventStatus.DRAFT, EventStatus.SCHEDULED].includes(proposal.event.status as any)) {
      throw new Error('Cannot edit proposals after event has started');
    }

    // 4. Validate data if provided
    if (data.title || data.content || data.imageCid) {
      this.validateProposalData(data);
    }

    // 5. Build update data object
    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.imageCid !== undefined) updateData.imageCid = data.imageCid;
    if (data.order !== undefined) updateData.order = data.order;

    // 6. Update proposal
    return prisma.proposal.update({
      where: { id: proposalId },
      data: updateData,
    });
  }

  /**
   * Delete a proposal
   */
  static async deleteProposal(proposalId: string, brandId: string): Promise<void> {
    // 1. Fetch proposal with event and count
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        event: {
          include: {
            _count: {
              select: { proposals: true },
            },
          },
        },
      },
    });

    if (!proposal) {
      throw new Error('Proposal not found');
    }

    // 2. Ownership check
    if (proposal.event.brandId !== brandId) {
      throw new Error('Forbidden: You do not own this proposal');
    }

    // 3. Can only delete in DRAFT or SCHEDULED
    if (![EventStatus.DRAFT, EventStatus.SCHEDULED].includes(proposal.event.status as any)) {
      throw new Error('Cannot delete proposals after event has started');
    }

    // 4. Ensure at least 2 proposals remain
    if (proposal.event._count.proposals <= 2) {
      throw new Error('VOTE_ONLY events must have at least 2 proposals. Cannot delete.');
    }

    // 5. Delete proposal
    await prisma.proposal.delete({ where: { id: proposalId } });
  }

  /**
   * Get all proposals for an event
   */
  static async getProposalsByEvent(eventId: string): Promise<Proposal[]> {
    return prisma.proposal.findMany({
      where: { eventId },
      orderBy: { order: 'asc' },
    });
  }

  /**
   * Get a single proposal by ID
   */
  static async getProposalById(proposalId: string): Promise<Proposal | null> {
    return prisma.proposal.findUnique({
      where: { id: proposalId },
    });
  }
}
