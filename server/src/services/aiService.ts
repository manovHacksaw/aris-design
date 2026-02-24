import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import axios from 'axios';
import FormData from 'form-data';
import { prisma } from '../lib/prisma.js';
import { getDetailedEventAnalytics } from './analyticsService.js';

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
}
