import logger from '../../lib/logger';
import { prisma } from '../../lib/prisma';
import { AnalyticsQueryService } from '../analytics/AnalyticsQueryService';
import { AnalyticsBrandService } from '../analytics/AnalyticsBrandService';
import { AiUtils } from './AiUtils';

export class AiReportService {
    /**
     * Generate an AI summary for a completed event and store it in EventAnalytics.
     */
    static async generateEventSummary(eventId: string): Promise<string | null> {
        try {
            // 1. Clear existing summary
            await prisma.eventAnalytics.update({
                where: { eventId },
                data: { aiSummary: null },
            });

            // 2. Fetch Detailed Analytics
            const analytics = await AnalyticsQueryService.getDetailedEventAnalytics(eventId);
            if (!analytics) return null;

            const {
                totalViews, totalVotes, totalShares, totalClicks, uniqueParticipants,
                winningMargin, votesByGender, votesByAgeGroup, contentMetrics,
                votesOverTime
            } = analytics;

            // 3. Format Data for Prompt
            const demographicsStr = `
            - Gender: Male (${votesByGender.male}), Female (${votesByGender.female}), Non-Binary (${votesByGender.nonBinary}), Other (${votesByGender.other})
            - Age Groups: <24 (${votesByAgeGroup['24_under']}), 25-34 (${votesByAgeGroup['25_34']}), 35-44 (${votesByAgeGroup['35_44']}), 45-54 (${votesByAgeGroup['45_54']}), 55+ (${votesByAgeGroup['55_64'] + votesByAgeGroup['65_plus']})
            `;

            let winnerInfo = "No votes cast.";
            if (contentMetrics.length > 0 && totalVotes > 0) {
                const winner = contentMetrics.reduce((prev, current) => (prev.voteCount > current.voteCount) ? prev : current);
                winnerInfo = `Winner: "${winner.title}" with ${winner.voteCount} votes (${winner.votePercentage.toFixed(1)}%). Rank 2 gap: ${winningMargin.toFixed(1)}%`;
            }

            const peakTime = votesOverTime.length > 0
                ? votesOverTime.reduce((a, b) => a.count > b.count ? a : b).timestamp
                : "N/A";

            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: { brand: true }
            });

            const prompt = `
            Act as an expert data analyst. Write a comprehensive, data-driven summary for the completed event "${event?.title}".
            
            **Event Details:**
            - Brand: ${event?.brand.name}
            - Description: ${event?.description || 'N/A'}
            
            **Performance Metrics:**
            - Total Views: ${totalViews}
            - Total Votes: ${totalVotes}
            - Unique Participants: ${uniqueParticipants}
            - Engagement Rate (Votes/Views): ${(totalViews > 0 ? (totalVotes / totalViews * 100).toFixed(1) : 0)}%
            - Shares: ${totalShares}
            - Clicks: ${totalClicks}
            
            **Demographics:**
            ${demographicsStr}
            
            **Outcome:**
            - ${winnerInfo}
            - Voting Peak Time: ${peakTime}
            
            **Instructions:**
            1. Write a 4-5 sentence professional summary.
            2. Analyze user behavior: mention which demographic segment was most active if data supports it.
            3. Comment on the engagement level (conversion rate) and shareability.
            4. State the winner clearly and the decisiveness of the victory (winning margin).
            5. Avoid generic phrases like "wrapped up in style". Use specific numbers to back up your statements.
            6. Do not use Markdown formatting (bold/italic). Just plain text.
            `;

            // 4. Generate Content
            const model = AiUtils.getModel();
            const result = await model.generateContent(prompt);
            const summary = result.response.text().trim();

            // 5. Save to EventAnalytics
            await prisma.eventAnalytics.update({
                where: { eventId },
                data: { aiSummary: summary },
            });

            logger.info({ eventId }, `✨ [AiReportService] Generated rich event summary:`);
            return summary;
        } catch (error) {
            logger.error(error, `[AiReportService] Failed to generate event summary for ${eventId}:`);
            return null;
        }
    }

    /**
     * Run the full 5-stage AI insights pipeline for a completed event.
     */
    static async generateEventInsights(eventId: string): Promise<any | null> {
        try {
            const model = AiUtils.getModel();

            // ── Fetch event + content options ────────────────────────────────
            const event = await prisma.event.findUnique({
                where: { id: eventId },
                include: {
                    brand: { select: { name: true } },
                    proposals: {
                        select: { id: true, title: true, content: true, imageUrl: true, order: true },
                        orderBy: { order: 'asc' },
                    },
                },
            });
            if (!event) throw new Error('Event not found');

            type ContentOption = { id: string; label: string; title: string; imageUrl: string | null; text: string | null };
            let contentOptions: ContentOption[] = [];

            if (event.eventType === 'post_and_vote') {
                const submissions = await prisma.submission.findMany({
                    where: { eventId, status: { not: 'rejected' } },
                    select: { id: true, imageUrl: true, caption: true },
                    orderBy: { voteCount: 'desc' },
                });
                contentOptions = submissions.map((s, i) => ({
                    id: s.id,
                    label: String.fromCharCode(65 + i),
                    title: s.caption || `Submission ${i + 1}`,
                    imageUrl: s.imageUrl,
                    text: s.caption,
                }));
            } else {
                contentOptions = event.proposals.map((p, i) => ({
                    id: p.id,
                    label: String.fromCharCode(65 + i),
                    title: p.title,
                    imageUrl: p.imageUrl,
                    text: p.content,
                }));
            }

            // ── Fetch analytics + clicks in parallel ─────────────────────────
            const [analytics, clicks] = await Promise.all([
                AnalyticsQueryService.getDetailedEventAnalytics(eventId),
                AnalyticsQueryService.getEventClicksBreakdown(eventId),
            ]);

            const dcs = (1 - analytics.normalizedEntropy) * 0.6 + analytics.avgParticipantTrustScore * 0.4;

            const labelById = Object.fromEntries(contentOptions.map(c => [c.id, c.label]));
            const contentWithVotes = analytics.contentMetrics.map(cm => ({
                label: labelById[cm.id] || cm.id,
                title: cm.title,
                voteCount: cm.voteCount,
                votePercentage: parseFloat(cm.votePercentage.toFixed(1)),
                rank: cm.rank,
                demographicBreakdown: cm.demographicBreakdown,
            }));

            // ── STAGE 1: Feature Extraction ──────────────────────────────────
            const contentDescriptions = contentOptions.map(c =>
                `Option ${c.label}: Title="${c.title}"` +
                (c.text ? `, Copy="${c.text}"` : '') +
                (c.imageUrl ? `, ImageURL="${c.imageUrl}"` : '')
            ).join('\n');

            const featurePrompt = `You are a content feature extraction system.

INPUT CONTENT OPTIONS:
${contentDescriptions}

TASK:
Break each content option into structured features. Use JSON format.`;

            const featureResult = await model.generateContent(featurePrompt);
            const featureText = featureResult.response.text().trim();
            const featureJsonMatch = featureText.match(/\{[\s\S]*\}/);
            const featureExtraction = featureJsonMatch ? JSON.parse(featureJsonMatch[0]) : {};

            // ── STAGE 2: Quant Analysis ──────────────────────────────────────
            const quantPrompt = `You are a data analyst. Analyze behavior and signal quality for event "${event.title}".`;

            const quantResult = await model.generateContent(quantPrompt);
            const quantText = quantResult.response.text().trim();
            const quantJsonMatch = quantText.match(/\{[\s\S]*\}/);
            const quantAnalysis = quantJsonMatch ? JSON.parse(quantJsonMatch[0]) : { raw: quantText };

            // ── STAGE 3: Feature → Performance Mapping ───────────────────────
            const mappingPrompt = `Map features → performance for this event. Identify winning/losing patterns.`;

            const mappingResult = await model.generateContent(mappingPrompt);
            const mappingText = mappingResult.response.text().trim();
            const mappingJsonMatch = mappingText.match(/\{[\s\S]*\}/);
            const featureMapping = mappingJsonMatch ? JSON.parse(mappingJsonMatch[0]) : { raw: mappingText };

            // ── STAGE 4: Insight Generation ──────────────────────────────────
            const insightPrompt = `Generate 5-7 sharp, high-signal brand insights based on this data.`;

            const insightResult = await model.generateContent(insightPrompt);
            const insightText = insightResult.response.text().trim();
            const insightJsonMatch = insightText.match(/\[[\s\S]*\]/);
            const insights = insightJsonMatch ? JSON.parse(insightJsonMatch[0]) : [insightText];

            // ── STAGE 5: Actions ─────────────────────────────────────────────
            const actionsPrompt = `Generate growth actions following the decision with DCS ${dcs.toFixed(3)}.`;

            const actionsResult = await model.generateContent(actionsPrompt);
            const actionsText = actionsResult.response.text().trim();
            const actionsJsonMatch = actionsText.match(/\{[\s\S]*\}/);
            const actions = actionsJsonMatch ? JSON.parse(actionsJsonMatch[0]) : { raw: actionsText };

            logger.info({ eventId }, `✨ [AiReportService] Generated full insights pipeline:`);

            return {
                event: {
                    id: event.id,
                    title: event.title,
                    description: event.description,
                    brandName: event.brand.name,
                    category: event.category,
                    eventType: event.eventType,
                },
                content: contentOptions,
                metrics: {
                    totalVotes: analytics.totalVotes,
                    totalViews: analytics.totalViews,
                    uniqueParticipants: analytics.uniqueParticipants,
                    winningMargin: analytics.winningMargin,
                    normalizedEntropy: analytics.normalizedEntropy,
                    dcs,
                    avgParticipantTrustScore: analytics.avgParticipantTrustScore,
                    contentMetrics: contentWithVotes,
                    votesByGender: analytics.votesByGender,
                    votesByAgeGroup: analytics.votesByAgeGroup,
                    clicks,
                },
                stages: {
                    featureExtraction,
                    quantAnalysis,
                    featurePerformanceMapping: featureMapping,
                    insights,
                    actions,
                },
            };
        } catch (error) {
            logger.error(error, `[AiReportService] Failed to generate event insights for ${eventId}:`);
            throw error;
        }
    }

    /**
     * Generate an AI summary for a brand based on all its events
     */
    static async generateBrandSummary(brandId: string): Promise<string | null> {
        try {
            // 1. Clear existing summary
            await prisma.brand.update({
                where: { id: brandId },
                data: { aiSummary: null },
            });

            // 2. Fetch Brand Analytics
            const analytics = await AnalyticsBrandService.getBrandAnalytics(brandId);
            if (!analytics) return null;

            const {
                totalEvents, totalVotesAcrossEvents, totalUniqueParticipants,
                averageWinningMargin, overallVotesByGender, overallVotesByAgeGroup,
                eventsSummary
            } = analytics;

            const brand = await prisma.brand.findUnique({
                where: { id: brandId },
                select: { name: true, description: true }
            });

            // 3. Format Data for Prompt
            const demographicsStr = `
            - Gender: Male (${overallVotesByGender.male}), Female (${overallVotesByGender.female}), Non-Binary (${overallVotesByGender.nonBinary}), Other (${overallVotesByGender.other})
            - Age Groups: <24 (${overallVotesByAgeGroup['24_under']}), 25-34 (${overallVotesByAgeGroup['25_34']}), 35-44 (${overallVotesByAgeGroup['35_44']}), 45-54 (${overallVotesByAgeGroup['45_54']}), 55+ (${overallVotesByAgeGroup['55_64'] + overallVotesByAgeGroup['65_plus']})
            `;

            let topEventInfo = "No events with interactions yet.";
            if (eventsSummary.length > 0) {
                const topEvent = eventsSummary.reduce((prev: any, current: any) => (prev.totalVotes > current.totalVotes) ? prev : current);
                if (topEvent.totalVotes > 0) {
                    topEventInfo = `Most Engaging Event: "${topEvent.title}" with ${topEvent.totalVotes} votes.`;
                }
            }

            const prompt = `
            Act as an expert data analyst. Write a comprehensive, data-driven brand summary for "${brand?.name}".
            
            **Brand Details:**
            - Description: ${brand?.description || 'N/A'}
            
            **Overall Performance Metrics:**
            - Total Events Hosted: ${totalEvents}
            - Total Votes Across All Events: ${totalVotesAcrossEvents}
            - Unique Participants: ${totalUniqueParticipants}
            - Average Winning Margin: ${averageWinningMargin.toFixed(1)}%
            
            **Audience Demographics:**
            ${demographicsStr}
            
            **Highlights:**
            - ${topEventInfo}
            
            **Instructions:**
            1. Write a 4-5 sentence professional summary providing brand-level insights.
            2. Analyze the audience: mention which demographic segment is most active for this brand.
            3. Comment on the overall engagement across all events.
            4. Suggest a general "recommended next action" for the brand.
            `;

            // 4. Generate Content
            const model = AiUtils.getModel();
            const result = await model.generateContent(prompt);
            const summary = result.response.text().trim();

            // 5. Save to Brand
            await prisma.brand.update({
                where: { id: brandId },
                data: { aiSummary: summary },
            });

            logger.info({ brandId }, `✨ [AiReportService] Generated rich brand summary:`);
            return summary;
        } catch (error) {
            logger.error(error, `[AiReportService] Failed to generate brand summary for ${brandId}:`);
            return null;
        }
    }
}
