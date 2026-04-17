import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { AnalyticsTrackingService } from '../../services/analytics/AnalyticsTrackingService.js';
import { AnalyticsQueryService } from '../../services/analytics/AnalyticsQueryService.js';
import { AnalyticsBrandService } from '../../services/analytics/AnalyticsBrandService.js';
import { AiReportService } from '../../services/ai/AiReportService.js';

async function requireEventOwner(eventId: string, userId: string | undefined, res: Response): Promise<boolean> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { status: true, brand: { select: { ownerId: true } } },
  });
  if (!event) { res.status(404).json({ error: 'Event not found' }); return false; }
  if (event.brand.ownerId !== userId) { res.status(403).json({ error: 'Unauthorized' }); return false; }
  return true;
}

async function requireBrand(userId: string | undefined, res: Response) {
  const brand = await prisma.brand.findFirst({ where: { ownerId: userId }, select: { id: true } });
  if (!brand) { res.status(404).json({ error: 'Brand not found' }); return null; }
  return brand;
}

export const trackEventView = async (req: Request, res: Response): Promise<void> => {
  try {
    await AnalyticsTrackingService.trackEventView(req.params.id, req.user?.id ?? null);
    res.status(200).json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to track event view' });
  }
};

export const trackShare = async (req: Request, res: Response): Promise<void> => {
  try {
    await AnalyticsTrackingService.trackShare(req.params.id, req.user?.id ?? null);
    res.status(200).json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to track share' });
  }
};

export const trackClick = async (req: Request, res: Response): Promise<void> => {
  try {
    const { target } = req.body;
    if (!target || typeof target !== 'string') {
      res.status(400).json({ error: 'target is required' });
      return;
    }
    await AnalyticsTrackingService.trackClick(req.params.id, req.user?.id ?? null, target);
    res.status(200).json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to track click' });
  }
};

export const getEventAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!await requireEventOwner(req.params.id, req.user?.id, res)) return;
    const analytics = await AnalyticsQueryService.getEventAnalytics(req.params.id);
    res.status(200).json(analytics);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch analytics' });
  }
};

export const getDetailedEventAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!await requireEventOwner(req.params.id, req.user?.id, res)) return;
    const analytics = await AnalyticsQueryService.getDetailedEventAnalytics(req.params.id);
    res.status(200).json(analytics);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch detailed analytics' });
  }
};

export const getBrandOverview = async (req: Request, res: Response): Promise<void> => {
  try {
    const brand = await requireBrand(req.user?.id, res);
    if (!brand) return;
    const analytics = await AnalyticsBrandService.getBrandAnalytics(brand.id);
    res.status(200).json(analytics);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch brand analytics' });
  }
};

export const generateEventSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = req.params.id;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { status: true, brand: { select: { ownerId: true } } },
    });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    if (event.brand.ownerId !== req.user?.id) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }
    if (event.status !== 'completed') {
      res.status(400).json({ error: 'Event must be completed' });
      return;
    }

    const existing = await prisma.eventAnalytics.findUnique({ where: { eventId }, select: { aiSummary: true } });
    if (existing?.aiSummary) {
      res.status(200).json({ aiSummary: existing.aiSummary });
      return;
    }

    const summary = await AiReportService.generateEventSummary(eventId);
    if (!summary) {
      res.status(500).json({ error: 'Failed to generate summary' });
      return;
    }
    res.status(200).json({ aiSummary: summary });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to generate summary' });
  }
};

export const getBrandStats = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user?.id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    const stats = await AnalyticsBrandService.getBrandStats(req.user.id);
    res.status(200).json(stats);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch brand stats' });
  }
};

export const getBrandTimeseries = async (req: Request, res: Response): Promise<void> => {
  try {
    const { metric, from, to } = req.query;
    if (!metric || typeof metric !== 'string') {
      res.status(400).json({ error: 'metric query param is required' });
      return;
    }
    const brand = await requireBrand(req.user?.id, res);
    if (!brand) return;
    const series = await AnalyticsBrandService.getBrandTimeseries(brand.id, metric, from as string, to as string);
    res.status(200).json(series);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch brand timeseries' });
  }
};

export const getEventClicksBreakdown = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!await requireEventOwner(req.params.id, req.user?.id, res)) return;
    const breakdown = await AnalyticsQueryService.getEventClicksBreakdown(req.params.id);
    res.status(200).json(breakdown);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch event clicks breakdown' });
  }
};

export const getBrandClicksBreakdown = async (req: Request, res: Response): Promise<void> => {
  try {
    const brand = await requireBrand(req.user?.id, res);
    if (!brand) return;
    const breakdown = await AnalyticsBrandService.getBrandClicksBreakdown(brand.id);
    res.status(200).json(breakdown);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch brand clicks breakdown' });
  }
};

export const trackBrandView = async (req: Request, res: Response): Promise<void> => {
  try {
    await AnalyticsBrandService.trackBrandView(req.params.id);
    res.status(200).json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to track brand view' });
  }
};

export const getBrandViews = async (req: Request, res: Response): Promise<void> => {
  try {
    const views = await AnalyticsBrandService.getBrandViews(req.params.id);
    res.status(200).json(views);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch brand views' });
  }
};

export const getBrandFollowerGrowth = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to, granularity } = req.query;
    const brand = await requireBrand(req.user?.id, res);
    if (!brand) return;
    const growth = await AnalyticsBrandService.getFollowerGrowth(brand.id, from as string, to as string, (granularity as string) || 'day');
    res.status(200).json(growth);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch follower growth' });
  }
};

export const generateEventInsights = async (req: Request, res: Response): Promise<void> => {
  try {
    const eventId = req.params.id;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { status: true, brand: { select: { ownerId: true } } },
    });
    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }
    if (event.brand.ownerId !== req.user?.id) {
      res.status(403).json({ error: 'Unauthorized' });
      return;
    }
    if (event.status !== 'completed') {
      res.status(400).json({ error: 'Event must be completed to generate insights' });
      return;
    }

    const insights = await AiReportService.generateEventInsights(eventId);
    res.status(200).json(insights);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to generate event insights' });
  }
};

export const generateBrandSummary = async (req: Request, res: Response): Promise<void> => {
  try {
    const brand = await requireBrand(req.user?.id, res);
    if (!brand) return;
    const summary = await AiReportService.generateBrandSummary(brand.id);
    if (!summary) {
      res.status(500).json({ error: 'Failed to generate brand summary' });
      return;
    }
    res.status(200).json({ aiSummary: summary });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to generate brand summary' });
  }
};
