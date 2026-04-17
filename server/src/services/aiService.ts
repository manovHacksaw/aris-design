import logger from '../lib/logger';
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';
import { prisma } from '../lib/prisma.js';
import { getDetailedEventAnalytics, getEventClicksBreakdown, AnalyticsService } from './analyticsService.js';

dotenv.config();

export class AiService {
    private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    private static PINATA_JWT = process.env.PINATA_JWT || '';

    /**
     * Generate an image prompt using Gemini
     */
    static async generateImagePrompt(basePrompt: string): Promise<string> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `Convert this simple description into a high-quality, detailed image generation prompt for an event banner or proposal. Keep it professional and visually descriptive. Input: "${basePrompt}"`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error) {
            logger.error('Error generating image prompt:', error);
            throw new Error('Failed to generate image prompt');
        }
    }

    /**
     * Generate an image using Gemini's image generation capabilities (Imagen)
     */
    static async generateImage(prompt: string): Promise<{ base64: string, buffer: Buffer }> {
        try {
            logger.info('Generating image for prompt:', prompt);
            const model = this.genAI.getGenerativeModel({ model: "imagen-3.0-generate-001" });
            const result = await model.generateContent(prompt);
            const response = await result.response;

            const imagePart = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData);

            if (imagePart && imagePart.inlineData) {
                return {
                    base64: imagePart.inlineData.data,
                    buffer: Buffer.from(imagePart.inlineData.data, 'base64')
                };
            }

            throw new Error('No image data returned from model. Ensure your API Key has Imagen 3 access enabled.');
        } catch (error: any) {
            logger.error('Error generating image:', error);
            if (error.message?.includes('403') || error.message?.includes('not found')) {
                throw new Error('Imagen 3 access is not enabled for this API Key. Please enable it in Google AI Studio.');
            }
            throw error;
        }
    }

    /**
     * Upload image buffer to Pinata
     */
    static async uploadToPinata(buffer: Buffer, fileName: string): Promise<string> {
        try {
            const formData = new FormData();
            formData.append('file', buffer, { filename: fileName });
            formData.append('pinataMetadata', JSON.stringify({ name: fileName }));
            formData.append('pinataOptions', JSON.stringify({ cidVersion: 0 }));

            const response = await axios.post('https://api.pinata.cloud/pinning/pinFileToIPFS', formData, {
                headers: {
                    'Authorization': `Bearer ${this.PINATA_JWT}`,
                    ...formData.getHeaders()
                }
            });

            return response.data.IpfsHash;
        } catch (error: any) {
            logger.error('Pinata upload error:', error.response?.data || error.message);
            throw new Error('Failed to upload generated image to IPFS');
        }
    }

    /**
     * Generate a short marketing tagline for an event
     */
    static async generateTagline(title: string, description: string = ''): Promise<string> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `Generate a short, punchy marketing tagline (maximum 12 words) for a brand event titled: "${title}". ${description ? `Event description: "${description}".` : ''} Return only the tagline text with no quotes, no punctuation at the end, and no extra explanation.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim().replace(/^["']|["']$/g, '');
        } catch (error) {
            logger.error('Error generating tagline:', error);
            throw new Error('Failed to generate tagline');
        }
    }

    /**
     * Generate N distinct, testable event suggestions from a brand motive.
     * Uses a strict decision-systems prompt to ensure each event is hypothesis-driven.
     */
    static async generateEventDetails(params: {
        motive: string;
        brandName: string;
        brandBio: string;
        eventType: 'vote' | 'post';
        decisionDomain: string;
        targetMarket: string;
        budget: string;
        count: number;
        voteOptions: number;
    }): Promise<Array<{
        title: string;
        description: string;
        estimated_duration: string;
        hypothesis: string;
        estimated_votes: string;
        voting_options?: Array<{ title: string; content: string }>;
    }>> {
        const { motive, brandName, brandBio, eventType, decisionDomain, targetMarket, budget, count, voteOptions } = params;

        const eventTypeDesc = eventType === 'post'
            ? 'Post Campaign — creators submit original content and the audience votes for the best submission'
            : `Vote Campaign — the audience votes between ${voteOptions} fixed options defined by the brand`;

        const votingOptionsSchema = eventType === 'vote'
            ? `"voting_options": [array of exactly ${voteOptions} objects, each: {"title": "short option label", "content": "one-sentence rationale"}]`
            : '';

        const votingOptionsExample = eventType === 'vote'
            ? `,"voting_options":[{"title":"...","content":"..."}]`
            : '';

        const systemPrompt = `SYSTEM:
You are a decision systems designer. Convert brand intent into testable events.

OBJECTIVE (STRICT ORDER):
1. Define a clear decision
2. Ensure hypothesis is testable
3. Align with target audience
4. Fit within budget

CONTEXT:
Brand Name: ${brandName || 'Unknown Brand'}
Brand Bio: ${brandBio || 'No bio provided'}
Motive: ${motive}
Event Type: ${eventTypeDesc}
Decision Domain: ${decisionDomain || 'General'}
Target Market: ${targetMarket || 'General audience'}
Budget: ${budget || 'Not specified'}

TASK:
Generate exactly ${count} DISTINCT event idea(s). Each must represent a different way to test the motive — different angle, framing, or decision being tested. Do NOT repeat the same decision with different wording.

CONSTRAINTS:
- Each event must lead to a clear winner
- Avoid vague or opinion-only questions
- Align with audience psychology
- Each hypothesis must be falsifiable (starts with "We believe..." and ends with a measurable outcome)

OUTPUT FORMAT:
Return ONLY a valid JSON array with exactly ${count} object(s). No markdown, no explanation, no trailing text.

Each object:
{
  "title": "concise event title (max 60 chars)",
  "description": "2-3 sentences explaining the decision being tested and why it matters (max 250 chars)",
  "estimated_duration": "e.g. 3 days, 1 week, 48 hours",
  "hypothesis": "We believe [audience] will prefer [X] over [Y] because [reason], resulting in [measurable outcome]",
  "estimated_votes": "realistic vote count range based on budget and target market, e.g. 500–1,200"${eventType === 'vote' ? `,\n  ${votingOptionsSchema}` : ''}
}

NEGATIVE — do NOT produce:
- Generic campaigns ("Vote for your favorite!")
- Branding fluff ("Celebrate our brand journey")
- Unclear outcomes (no winner determinable)
- Duplicate event concepts

Format: [{"title":"...","description":"...","estimated_duration":"...","hypothesis":"...","estimated_votes":"..."${votingOptionsExample}}]`;

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(systemPrompt);
            const response = await result.response;
            const text = response.text().trim();

            const jsonMatch = text.match(/\[.*\]/s);
            const jsonStr = jsonMatch ? jsonMatch[0] : text;
            return JSON.parse(jsonStr);
        } catch (error) {
            logger.error('Error generating event details:', error);
            throw new Error('Failed to generate event details');
        }
    }

    /**
     * Generate N high-quality 16:9 banner image prompts for an event.
     */
    static async generateBannerPrompts(params: {
        title: string;
        description: string;
        theme?: string;
        decisionDomain?: string;
        targetMarket?: string;
        brandIdentity?: string;
        count: number;
    }): Promise<string[]> {
        const { title, description, theme, decisionDomain, targetMarket, brandIdentity, count } = params;

        const systemPrompt = `SYSTEM:
You are an expert visual prompt engineer for high-end brand banners.

OBJECTIVE (STRICT ORDER):
1. Visual clarity
2. Brand identity accuracy
3. Audience appeal
4. Aesthetic quality

INPUT:
- Title: ${title}
- Description: ${description}
- Theme: ${theme || 'Modern, clean'}
- Decision Domain: ${decisionDomain || 'General'}
- Target Market: ${targetMarket || 'General audience'}
- Brand Identity: ${brandIdentity || 'Professional, contemporary'}

TASK:
Generate exactly ${count} high-quality image prompt(s) for 16:9 banners. Output prompts only.

STRICT RULES:
- NO text, typography, captions rendered in image
- Leave top-right area clean for logo overlay
- Follow brand colors and tone exactly
- Strong focal subject
- Clean composition

NEGATIVE (embed in every prompt):
no text, no letters, no watermark, no clutter, no distortion, no low quality, no blurry

OUTPUT FORMAT:
Return ONLY a valid JSON array of exactly ${count} string(s). No markdown, no explanation.
Example: ["prompt 1", "prompt 2"]`;

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(systemPrompt);
            const text = result.response.text().trim();

            const jsonMatch = text.match(/\[.*\]/s);
            const jsonStr = jsonMatch ? jsonMatch[0] : text;
            const parsed = JSON.parse(jsonStr);

            if (!Array.isArray(parsed) || parsed.some(p => typeof p !== 'string')) {
                throw new Error('Invalid banner prompt format returned');
            }
            return parsed;
        } catch (error) {
            logger.error('Error generating banner prompts:', error);
            throw new Error('Failed to generate banner prompts');
        }
    }

    /**
     * Generate exactly 3 distinct visual prompt directions for a voting option image.
     */
    static async generateVotingOptionPrompts(params: {
        eventTitle: string;
        eventDescription?: string;
        decisionDomain?: string;
        targetMarket?: string;
        brandIdentity?: string;
        contentTitle?: string;
    }): Promise<string[]> {
        const { eventTitle, eventDescription, decisionDomain, targetMarket, brandIdentity, contentTitle } = params;

        const systemPrompt = `You are a senior visual strategist creating high-performing content variations for audience testing.

OBJECTIVE (STRICT ORDER):
1. Ensure each variation is clearly distinct
2. Maintain relevance to content title and event context
3. Align with target audience preferences
4. Preserve brand identity

INPUT:
- Event Title: ${eventTitle}
- Event Description: ${eventDescription || 'Not provided'}
- Decision Domain: ${decisionDomain || 'General'}
- Target Market: ${targetMarket || 'General audience'}
- Brand Identity: ${brandIdentity || 'Professional, contemporary'}
- Content Title: ${contentTitle || eventTitle}

TASK:
Generate exactly 3 distinct visual prompt directions for this content.

CONSTRAINTS:
- All 3 prompts must represent different visual approaches (e.g. close-up vs wide shot vs abstract)
- Each must stay true to the SAME content idea ("${contentTitle || eventTitle}")
- Avoid overlapping or minor variations — think: angle, mood, setting, style
- Keep strong, simple compositions
- Ensure appeal to target audience taste

OUTPUT FORMAT:
Return ONLY a valid JSON array of exactly 3 strings. No markdown, no explanation.
Example: ["prompt 1", "prompt 2", "prompt 3"]

STRICT IMAGE RULES (embed in every prompt):
- NO text, captions, typography, watermark
- NO logos rendered inside image
- Clean composition with one clear focal point
- Follow brand colors and tone
- no clutter, no distortion, no low quality, no multiple focal points`;

        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(systemPrompt);
            const text = result.response.text().trim();

            const jsonMatch = text.match(/\[.*\]/s);
            const jsonStr = jsonMatch ? jsonMatch[0] : text;
            const parsed = JSON.parse(jsonStr);

            if (!Array.isArray(parsed) || parsed.length !== 3 || parsed.some(p => typeof p !== 'string')) {
                throw new Error('Invalid voting option prompt format returned');
            }
            return parsed;
        } catch (error) {
            logger.error('Error generating voting option prompts:', error);
            throw new Error('Failed to generate voting option prompts');
        }
    }

    /**
     * Generate text proposals based on event details
     */
    static async generateProposals(title: string, description: string, category: string, count: number = 4): Promise<Array<{ title: string, content: string }>> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const prompt = `You are an expert event planner. For an event titled "${title}" with description "${description}" and category "${category}", generate ${count} unique and engaging voting options (proposals). 
      Return ONLY a JSON array of objects with "title" (short) and "content" (brief description) fields. 
      Format: [{"title": "...", "content": "..."}, ...]`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text().trim();

            const jsonMatch = text.match(/\[.*\]/s);
            const jsonStr = jsonMatch ? jsonMatch[0] : text;

            return JSON.parse(jsonStr);
        } catch (error) {
            logger.error('Error generating proposals:', error);
            throw new Error('Failed to generate proposals');
        }
    }

    /**
     * Generate an AI summary for a completed event and store it in EventAnalytics.
     */
    static async generateEventSummary(eventId: string): Promise<string | null> {
        try {
            // 1. Clear existing summary to allow UI to show loading if polled, or just to reset
            await prisma.eventAnalytics.update({
                where: { eventId },
                data: { aiSummary: null },
            });

            // 2. Fetch Detailed Analytics
            const analytics = await getDetailedEventAnalytics(eventId);
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
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(prompt);
            const summary = result.response.text().trim();

            // 5. Save to EventAnalytics
            await prisma.eventAnalytics.update({
                where: { eventId },
                data: { aiSummary: summary },
            });

            logger.info(`✨ [AiService] Generated rich event summary for ${eventId}`);
            return summary;
        } catch (error) {
            logger.error(`[AiService] Failed to generate event summary for ${eventId}:`, error);
            return null;
        }
    }

    /**
     * Run the full 5-stage AI insights pipeline for a completed event.
     * Stages: Feature Extraction → Quant Analysis → Feature-Performance Mapping → Insights → Actions
     * Only callable by the brand owner of the event.
     */
    static async generateEventInsights(eventId: string): Promise<any | null> {
        try {
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
                getDetailedEventAnalytics(eventId),
                getEventClicksBreakdown(eventId),
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
Break each content option into structured features:
1. Visual features (infer from title/copy if no image): colorTone (bright/dark/pastel/neutral), layoutDensity (minimal/balanced/cluttered), focalPoint (product/text/person/abstract)
2. Copy features: tone (playful/premium/urgent/emotional/neutral), length (short/medium/long), ctaPresence (yes/no)
3. Semantic tags: 3-5 tags like luxury, bold, minimal, functional, GenZ, corporate, aspirational

OUTPUT STRICT JSON (no markdown, no explanation):
{
  ${contentOptions.map(c => `"${c.label}": { "features": { "visual": { "colorTone": "...", "layoutDensity": "...", "focalPoint": "..." }, "copy": { "tone": "...", "length": "...", "ctaPresence": "..." }, "semanticTags": ["..."] } }`).join(',\n  ')}
}`;

            const featureResult = await model.generateContent(featurePrompt);
            const featureText = featureResult.response.text().trim();
            const featureJsonMatch = featureText.match(/\{[\s\S]*\}/);
            const featureExtraction = featureJsonMatch ? JSON.parse(featureJsonMatch[0]) : {};

            // ── STAGE 2: Quant Analysis ──────────────────────────────────────
            const quantPrompt = `You are a data analyst.

INPUT METRICS for event "${event.title}" by ${event.brand.name}:
- Total Votes: ${analytics.totalVotes}
- Content Performance:
${contentWithVotes.map(c => `  Option ${c.label} "${c.title}": ${c.voteCount} votes (${c.votePercentage}%) | Rank: ${c.rank ?? 'N/A'}`).join('\n')}
- Demographics:
  Gender: Male(${analytics.votesByGender.male}) Female(${analytics.votesByGender.female}) NonBinary(${analytics.votesByGender.nonBinary}) Other(${analytics.votesByGender.other}) Unknown(${analytics.votesByGender.unknown})
  Age: <24(${analytics.votesByAgeGroup['24_under']}) 25-34(${analytics.votesByAgeGroup['25_34']}) 35-44(${analytics.votesByAgeGroup['35_44']}) 45+(${analytics.votesByAgeGroup['45_54'] + analytics.votesByAgeGroup['55_64'] + analytics.votesByAgeGroup['65_plus']})
- Clicks: Vote(${clicks.vote}) Social(${clicks.social}) Website(${clicks.website}) Event(${clicks.event}) Other(${clicks.other})
- Normalized Entropy: ${analytics.normalizedEntropy.toFixed(3)} (0=unanimous, 1=split)
- Winning Margin: ${analytics.winningMargin.toFixed(1)}%
- Avg Voter Trust Score: ${analytics.avgParticipantTrustScore.toFixed(3)}
- Decision Confidence Score (DCS): ${dcs.toFixed(3)}

TASK:
1. Identify winner, margin strength (decisive/moderate/close), clarity level
2. Analyze behavior: vote vs click patterns, demographic splits
3. Evaluate signal quality: strong/weak/noisy decision

OUTPUT STRICT JSON:
{
  "winner": "...",
  "marginStrength": "...",
  "clarityLevel": "...",
  "behaviorAnalysis": "...",
  "signalQuality": "..."
}`;

            const quantResult = await model.generateContent(quantPrompt);
            const quantText = quantResult.response.text().trim();
            const quantJsonMatch = quantText.match(/\{[\s\S]*\}/);
            const quantAnalysis = quantJsonMatch ? JSON.parse(quantJsonMatch[0]) : { raw: quantText };

            // ── STAGE 3: Feature → Performance Mapping ───────────────────────
            const perOptionDemo = contentWithVotes.map(c => {
                const byGender = c.demographicBreakdown?.byGender || {};
                const byAge = c.demographicBreakdown?.byAgeGroup || {};
                const topGender = Object.entries(byGender).sort(([, a], [, b]) => (b as number) - (a as number))[0];
                const topAge = Object.entries(byAge).sort(([, a], [, b]) => (b as number) - (a as number))[0];
                return `Option ${c.label}: topGender=${topGender?.[0] || 'N/A'}, topAge=${topAge?.[0] || 'N/A'}`;
            }).join('\n');

            const mappingPrompt = `You are a consumer preference analyst.

INPUT:
Feature breakdown:
${JSON.stringify(featureExtraction, null, 2)}

Vote distribution:
${contentWithVotes.map(c => `Option ${c.label} "${c.title}": ${c.votePercentage}%`).join('\n')}

Per-option top demographics:
${perOptionDemo}

TASK:
1. Map features → performance: which specific features correlate with higher votes, which underperformed
2. Identify dominant preference patterns and rejected patterns
3. Segment analysis: which features resonate with which demographic group

OUTPUT STRICT JSON:
{
  "winning_features": ["..."],
  "losing_features": ["..."],
  "segment_preferences": { "description": "..." }
}`;

            const mappingResult = await model.generateContent(mappingPrompt);
            const mappingText = mappingResult.response.text().trim();
            const mappingJsonMatch = mappingText.match(/\{[\s\S]*\}/);
            const featureMapping = mappingJsonMatch ? JSON.parse(mappingJsonMatch[0]) : { raw: mappingText };

            // ── STAGE 4: Insight Generation ──────────────────────────────────
            const insightPrompt = `You are a brand strategist.

INPUT:
Analytical summary: ${JSON.stringify(quantAnalysis)}
Feature-performance mapping: ${JSON.stringify(featureMapping)}

TASK:
Generate 5-7 sharp, high-signal insights:
1. Why did the winner win?
2. Why did others lose?
3. What does this reveal about audience taste?
4. Are there hidden tensions or demographic polarization?
Focus on psychology, aesthetics, positioning. No generic observations.

OUTPUT STRICT JSON array of strings (no markdown):
["insight 1", "insight 2", ...]`;

            const insightResult = await model.generateContent(insightPrompt);
            const insightText = insightResult.response.text().trim();
            const insightJsonMatch = insightText.match(/\[[\s\S]*\]/);
            const insights = insightJsonMatch ? JSON.parse(insightJsonMatch[0]) : [insightText];

            // ── STAGE 5: Actions ─────────────────────────────────────────────
            const dcsLabel = dcs > 0.7 ? 'high confidence' : dcs > 0.4 ? 'moderate confidence' : 'low confidence';
            const actionsPrompt = `You are a growth strategist.

INPUT:
Insights: ${JSON.stringify(insights)}
Feature-performance mapping: ${JSON.stringify(featureMapping)}
DCS: ${dcs.toFixed(3)} (${dcsLabel} decision)

TASK:
1. Immediate decision: what should the brand do NOW based on this result
2. Strategic application: how to apply findings to product/marketing
3. Next experiments: 2-3 specific variations or dimensions to test next
4. Monetization impact: how this improves conversion or engagement

OUTPUT STRICT JSON:
{
  "decision": "...",
  "strategy": "...",
  "next_experiments": ["...", "..."],
  "business_impact": "..."
}`;

            const actionsResult = await model.generateContent(actionsPrompt);
            const actionsText = actionsResult.response.text().trim();
            const actionsJsonMatch = actionsText.match(/\{[\s\S]*\}/);
            const actions = actionsJsonMatch ? JSON.parse(actionsJsonMatch[0]) : { raw: actionsText };

            logger.info(`✨ [AiService] Generated full insights pipeline for event ${eventId}`);

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
            logger.error(`[AiService] Failed to generate event insights for ${eventId}:`, error);
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
            const analytics = await AnalyticsService.getBrandAnalytics(brandId);
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
            4. Suggest a general "recommended next action" for the brand based on their performance (e.g. host more events targeted at a specific demographic, try a different category).
            5. Avoid generic phrases. Use specific numbers to back up your statements.
            6. Do not use Markdown formatting (bold/italic). Just plain text.
            `;

            // 4. Generate Content
            const model = this.genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
            const result = await model.generateContent(prompt);
            const summary = result.response.text().trim();

            // 5. Save to Brand
            await prisma.brand.update({
                where: { id: brandId },
                data: { aiSummary: summary },
            });

            logger.info(`✨ [AiService] Generated rich brand summary for ${brandId}`);
            return summary;
        } catch (error) {
            logger.error(`[AiService] Failed to generate brand summary for ${brandId}:`, error);
            return null;
        }
    }
}
