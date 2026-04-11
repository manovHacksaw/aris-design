import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';
import { prisma } from '../lib/prisma.js';
import { getDetailedEventAnalytics, AnalyticsService } from './analyticsService.js';

dotenv.config();

export class AiService {
    private static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    private static PINATA_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiJhM2UzYzQ3OC01YzlhLTRhYzItODBhZS0yODE3NmQyZGRiOTIiLCJlbWFpbCI6Im1hbm9iZW5kcmEubWFuZGFsQGFyaXN0aHJvdHRsZS5vcmciLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiM2E3NWU4ZWFjMzBmYzQ3YzJlNGYiLCJzY29wZWRLZXlTZWNyZXQiOiI5ZDFkODk0M2YzMWE0MGIxMWMyNTkzNDhhZGNlNDJjZDkxZTI1NWEzYTQyNDU3YWIxYTFlODhlOGEwYzdlZGJlIiwiZXhwIjoxNzk2OTY3MjI3fQ.9-oN0bUHi4KZpKauJ5nDXThv_oVIt-UvZKkbOjc8JuE';

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
            console.error('Error generating image prompt:', error);
            throw new Error('Failed to generate image prompt');
        }
    }

    /**
     * Generate an image using Gemini's image generation capabilities (Imagen)
     */
    static async generateImage(prompt: string): Promise<{ base64: string, buffer: Buffer }> {
        try {
            console.log('Generating image for prompt:', prompt);
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
            console.error('Error generating image:', error);
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
            console.error('Pinata upload error:', error.response?.data || error.message);
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
            console.error('Error generating tagline:', error);
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
            console.error('Error generating event details:', error);
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
            console.error('Error generating banner prompts:', error);
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
            console.error('Error generating voting option prompts:', error);
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
            console.error('Error generating proposals:', error);
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

            console.log(`✨ [AiService] Generated rich event summary for ${eventId}`);
            return summary;
        } catch (error) {
            console.error(`[AiService] Failed to generate event summary for ${eventId}:`, error);
            return null;
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

            console.log(`✨ [AiService] Generated rich brand summary for ${brandId}`);
            return summary;
        } catch (error) {
            console.error(`[AiService] Failed to generate brand summary for ${brandId}:`, error);
            return null;
        }
    }
}
