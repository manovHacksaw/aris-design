import logger from '../../lib/logger';
import { AiUtils } from './AiUtils';

export class AiContentService {
    /**
     * Generate an image prompt using Gemini
     */
    static async generateImagePrompt(basePrompt: string): Promise<string> {
        try {
            const model = AiUtils.getModel("gemini-1.5-flash"); // Using flash for efficiency
            const prompt = `Convert this simple description into a high-quality, detailed image generation prompt for an event banner or proposal. Keep it professional and visually descriptive. Input: "${basePrompt}"`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim();
        } catch (error) {
            logger.error(error, 'Error generating image prompt:');
            throw new Error('Failed to generate image prompt');
        }
    }

    /**
     * Generate a short marketing tagline for an event
     */
    static async generateTagline(title: string, description: string = ''): Promise<string> {
        try {
            const model = AiUtils.getModel();
            const prompt = `Generate a short, punchy marketing tagline (maximum 12 words) for a brand event titled: "${title}". ${description ? `Event description: "${description}".` : ''} Return only the tagline text with no quotes, no punctuation at the end, and no extra explanation.`;

            const result = await model.generateContent(prompt);
            const response = await result.response;
            return response.text().trim().replace(/^["']|["']$/g, '');
        } catch (error) {
            logger.error(error, 'Error generating tagline:');
            throw new Error('Failed to generate tagline');
        }
    }

    /**
     * Generate N distinct, testable event suggestions from a brand motive.
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

Format: [{"title":"...","description":"...","estimated_duration":"...","hypothesis":"...","estimated_votes":"..."${votingOptionsExample}}]`;

        try {
            const model = AiUtils.getModel();
            const result = await model.generateContent(systemPrompt);
            const response = await result.response;
            const text = response.text().trim();

            const jsonMatch = text.match(/\[.*\]/s);
            const jsonStr = jsonMatch ? jsonMatch[0] : text;
            return JSON.parse(jsonStr);
        } catch (error) {
            logger.error(error, 'Error generating event details:');
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
Return ONLY a valid JSON array of exactly ${count} string(s). No markdown, no explanation.`;

        try {
            const model = AiUtils.getModel();
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
            logger.error(error, 'Error generating banner prompts:');
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
- All 3 prompts must represent different visual approaches
- Each must stay true to the SAME content idea ("${contentTitle || eventTitle}")
- Keep strong, simple compositions

OUTPUT FORMAT:
Return ONLY a valid JSON array of exactly 3 strings. No markdown, no explanation.

STRICT IMAGE RULES (embed in every prompt):
- NO text, captions, typography, watermark
- NO logos rendered inside image
- Clean composition with one clear focal point
- Follow brand colors and tone
- no clutter, no distortion, no low quality, no multiple focal points`;

        try {
            const model = AiUtils.getModel();
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
            logger.error(error, 'Error generating voting option prompts:');
            throw new Error('Failed to generate voting option prompts');
        }
    }

    /**
     * Generate text proposals based on event details
     */
    static async generateProposals(title: string, description: string, category: string, count: number = 4): Promise<Array<{ title: string, content: string }>> {
        try {
            const model = AiUtils.getModel();
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
            logger.error(error, 'Error generating proposals:');
            throw new Error('Failed to generate proposals');
        }
    }
}
