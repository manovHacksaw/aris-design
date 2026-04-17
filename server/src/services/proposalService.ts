import { prisma } from '../lib/prisma.js';
import { Proposal, ProposalType } from '@prisma/client';
import {
  CreateProposalRequest,
  UpdateProposalRequest,
} from '../types/proposal.js';
import { EventStatus } from '../types/event.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../utils/errors.js';

export class ProposalService {
  private static validateProposalData(data: CreateProposalRequest | UpdateProposalRequest): void {
    if ('type' in data) {
      if (data.type === 'IMAGE') {
        if (!data.imageCid) throw new ValidationError('IMAGE proposals require imageCid');
        if (!/^(Qm[1-9A-HJ-NP-Za-km-z]{44}|bafy[a-z0-9]{50,})$/.test(data.imageCid)) {
          throw new ValidationError('Invalid IPFS CID format');
        }
      }
    }
    if ('title' in data && data.title && data.title.trim().length === 0) {
      throw new ValidationError('Proposal title cannot be empty');
    }
  }

  static async createProposal(
    eventId: string,
    brandId: string,
    data: CreateProposalRequest
  ): Promise<Proposal> {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: { proposals: true },
    });

    if (!event || event.isDeleted) throw new NotFoundError('Event not found');
    if (event.brandId !== brandId) throw new ForbiddenError('You do not own this event');
    if (event.eventType !== 'vote_only') throw new ValidationError('Proposals are only allowed for VOTE_ONLY events');
    if (![EventStatus.DRAFT, EventStatus.SCHEDULED].includes(event.status as any)) {
      throw new ValidationError('Cannot add proposals after event has started');
    }
    if (event.proposals.length >= 10) throw new ValidationError('Vote only events can have at most 10 proposals');

    this.validateProposalData(data);

    return prisma.proposal.create({
      data: {
        eventId,
        type: data.type,
        title: data.title,
        content: data.content || null,
        imageCid: data.imageCid || null,
        order: data.order ?? event.proposals.length,
      },
    });
  }

  static async updateProposal(
    proposalId: string,
    brandId: string,
    data: UpdateProposalRequest
  ): Promise<Proposal> {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: { event: true },
    });

    if (!proposal) throw new NotFoundError('Proposal not found');
    if (proposal.event.brandId !== brandId) throw new ForbiddenError('You do not own this proposal');
    if (![EventStatus.DRAFT, EventStatus.SCHEDULED].includes(proposal.event.status as any)) {
      throw new ValidationError('Cannot edit proposals after event has started');
    }
    if (data.title || data.content || data.imageCid) this.validateProposalData(data);

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.imageCid !== undefined) updateData.imageCid = data.imageCid;
    if (data.order !== undefined) updateData.order = data.order;

    return prisma.proposal.update({ where: { id: proposalId }, data: updateData });
  }

  static async deleteProposal(proposalId: string, brandId: string): Promise<void> {
    const proposal = await prisma.proposal.findUnique({
      where: { id: proposalId },
      include: {
        event: {
          include: { _count: { select: { proposals: true } } },
        },
      },
    });

    if (!proposal) throw new NotFoundError('Proposal not found');
    if (proposal.event.brandId !== brandId) throw new ForbiddenError('You do not own this proposal');
    if (![EventStatus.DRAFT, EventStatus.SCHEDULED].includes(proposal.event.status as any)) {
      throw new ValidationError('Cannot delete proposals after event has started');
    }
    if (proposal.event._count.proposals <= 2) {
      throw new ValidationError('VOTE_ONLY events must have at least 2 proposals. Cannot delete.');
    }

    await prisma.proposal.delete({ where: { id: proposalId } });
  }

  static async getProposalsByEvent(eventId: string): Promise<Proposal[]> {
    return prisma.proposal.findMany({ where: { eventId }, orderBy: { order: 'asc' } });
  }

  static async getProposalById(proposalId: string): Promise<Proposal | null> {
    return prisma.proposal.findUnique({ where: { id: proposalId } });
  }
}
