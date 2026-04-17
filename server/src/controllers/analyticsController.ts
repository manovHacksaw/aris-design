import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { AnalyticsService } from '../services/analyticsService';
import { AiService } from '../services/aiService';

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

export const trackEventView = async (req: Request, res: Response) => {
  try {
    await AnalyticsService.trackEventView(req.params.id, req.user?.id ?? null);
    res.status(200).json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to track event view' });
  }
};

export const trackShare = async (req: Request, res: Response) => {
  try {
    await AnalyticsService.trackShare(req.params.id, req.user?.id ?? null);
    res.status(200).json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to track share' });
  }
};

export const trackClick = async (req: Request, res: Response) => {
  try {
    const { target } = req.body;
    if (!target || typeof target !== 'string') {
      return res.status(400).json({ error: 'target is required' });
    }
    await AnalyticsService.trackClick(req.params.id, req.user?.id ?? null, target);
    res.status(200).json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to track click' });
  }
};

export const getEventAnalytics = async (req: Request, res: Response) => {
  try {
    if (!await requireEventOwner(req.params.id, req.user?.id, res)) return;
    const analytics = await AnalyticsService.getEventAnalytics(req.params.id);
    res.status(200).json(analytics);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch analytics' });
  }
};

export const getDetailedEventAnalytics = async (req: Request, res: Response) => {
  try {
    if (!await requireEventOwner(req.params.id, req.user?.id, res)) return;
    const analytics = await AnalyticsService.getDetailedEventAnalytics(req.params.id);
    res.status(200).json(analytics);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch detailed analytics' });
  }
};

export const getBrandOverview = async (req: Request, res: Response) => {
  try {
    const brand = await requireBrand(req.user?.id, res);
    if (!brand) return;
    const analytics = await AnalyticsService.getBrandAnalytics(brand.id);
    res.status(200).json(analytics);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch brand analytics' });
  }
};

export const generateEventSummary = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { status: true, brand: { select: { ownerId: true } } },
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.brand.ownerId !== req.user?.id) return res.status(403).json({ error: 'Unauthorized' });
    if (event.status !== 'completed') return res.status(400).json({ error: 'Event must be completed' });

    const existing = await prisma.eventAnalytics.findUnique({ where: { eventId }, select: { aiSummary: true } });
    if (existing?.aiSummary) return res.status(200).json({ aiSummary: existing.aiSummary });

    const summary = await AiService.generateEventSummary(eventId);
    if (!summary) return res.status(500).json({ error: 'Failed to generate summary' });
    res.status(200).json({ aiSummary: summary });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to generate summary' });
  }
};

export const getBrandStats = async (req: Request, res: Response) => {
  try {
    if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
    const stats = await AnalyticsService.getBrandStats(req.user.id);
    res.status(200).json(stats);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch brand stats' });
  }
};

export const getBrandTimeseries = async (req: Request, res: Response) => {
  try {
    const { metric, from, to } = req.query;
    if (!metric || typeof metric !== 'string') {
      return res.status(400).json({ error: 'metric query param is required' });
    }
    const brand = await requireBrand(req.user?.id, res);
    if (!brand) return;
    const series = await AnalyticsService.getBrandTimeseries(brand.id, metric, from as string, to as string);
    res.status(200).json(series);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch brand timeseries' });
  }
};

export const getEventClicksBreakdown = async (req: Request, res: Response) => {
  try {
    if (!await requireEventOwner(req.params.id, req.user?.id, res)) return;
    const breakdown = await AnalyticsService.getEventClicksBreakdown(req.params.id);
    res.status(200).json(breakdown);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch event clicks breakdown' });
  }
};

export const getBrandClicksBreakdown = async (req: Request, res: Response) => {
  try {
    const brand = await requireBrand(req.user?.id, res);
    if (!brand) return;
    const breakdown = await AnalyticsService.getBrandClicksBreakdown(brand.id);
    res.status(200).json(breakdown);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch brand clicks breakdown' });
  }
};

export const trackBrandView = async (req: Request, res: Response) => {
  try {
    await AnalyticsService.trackBrandView(req.params.id);
    res.status(200).json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to track brand view' });
  }
};

export const getBrandViews = async (req: Request, res: Response) => {
  try {
    const views = await AnalyticsService.getBrandViews(req.params.id);
    res.status(200).json(views);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch brand views' });
  }
};

export const getBrandFollowerGrowth = async (req: Request, res: Response) => {
  try {
    const { from, to, granularity } = req.query;
    const brand = await requireBrand(req.user?.id, res);
    if (!brand) return;
    const growth = await AnalyticsService.getFollowerGrowth(brand.id, from as string, to as string, (granularity as string) || 'day');
    res.status(200).json(growth);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to fetch follower growth' });
  }
};

export const generateEventInsights = async (req: Request, res: Response) => {
  try {
    const eventId = req.params.id;
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { status: true, brand: { select: { ownerId: true } } },
    });
    if (!event) return res.status(404).json({ error: 'Event not found' });
    if (event.brand.ownerId !== req.user?.id) return res.status(403).json({ error: 'Unauthorized' });
    if (event.status !== 'completed') return res.status(400).json({ error: 'Event must be completed to generate insights' });

    const insights = await AiService.generateEventInsights(eventId);
    res.status(200).json(insights);
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to generate event insights' });
  }
};

export const generateBrandSummary = async (req: Request, res: Response) => {
  try {
    const brand = await requireBrand(req.user?.id, res);
    if (!brand) return;
    const summary = await AiService.generateBrandSummary(brand.id);
    if (!summary) return res.status(500).json({ error: 'Failed to generate brand summary' });
    res.status(200).json({ aiSummary: summary });
  } catch (e: any) {
    res.status(500).json({ error: e.message || 'Failed to generate brand summary' });
  }
};
