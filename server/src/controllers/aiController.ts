import logger from '../lib/logger';
import { Request, Response } from 'express';
import { AiService } from '../services/aiService';

export const generateBannerPrompts = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { title, description, theme, decisionDomain, targetMarket, brandIdentity, count } = req.body;

        if (!title) {
            return res.status(400).json({ success: false, error: 'Title is required' });
        }

        const prompts = await AiService.generateBannerPrompts({
            title,
            description: description || '',
            theme: theme || '',
            decisionDomain: decisionDomain || '',
            targetMarket: targetMarket || '',
            brandIdentity: brandIdentity || '',
            count: Math.min(Math.max(parseInt(count) || 3, 1), 6),
        });

        return res.json({ success: true, prompts });
    } catch (error: any) {
        logger.error('Error in AI generateBannerPrompts:', error);
        return res.status(500).json({ success: false, error: 'Banner prompt generation failed', message: error.message });
    }
};

export const generateVotingOptionPrompts = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { eventTitle, eventDescription, decisionDomain, targetMarket, brandIdentity, contentTitle } = req.body;

        if (!eventTitle) {
            return res.status(400).json({ success: false, error: 'eventTitle is required' });
        }

        const prompts = await AiService.generateVotingOptionPrompts({
            eventTitle,
            eventDescription: eventDescription || '',
            decisionDomain: decisionDomain || '',
            targetMarket: targetMarket || '',
            brandIdentity: brandIdentity || '',
            contentTitle: contentTitle || '',
        });

        return res.json({ success: true, prompts });
    } catch (error: any) {
        logger.error('Error in AI generateVotingOptionPrompts:', error);
        return res.status(500).json({ success: false, error: 'Voting option prompt generation failed', message: error.message });
    }
};

export const generateImage = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { prompt, refineOnly } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        // 1. Refine the prompt using Gemini
        const refinedPrompt = await AiService.generateImagePrompt(prompt);

        if (refineOnly) {
            return res.json({
                success: true,
                refinedPrompt,
                message: 'Prompt refined with Gemini.'
            });
        }

        // 2. Generate the actual image using Imagen
        try {
            const { buffer } = await AiService.generateImage(refinedPrompt);

            // 3. Upload to IPFS (Pinata)
            const cid = await AiService.uploadToPinata(buffer, `ai-gen-${Date.now()}.png`);

            return res.json({
                success: true,
                refinedPrompt,
                cid,
                url: `https://gateway.pinata.cloud/ipfs/${cid}`,
                message: 'Image generated and uploaded successfully.'
            });
        } catch (genError: any) {
            logger.warn('Image generation failed, returning refined prompt only:', genError.message);
            return res.json({
                success: true,
                refinedPrompt,
                imageGenError: genError.message,
                message: 'Prompt refined, but image generation failed. ' + genError.message
            });
        }
    } catch (error: any) {
        logger.error('Error in AI generateImage:', error);
        return res.status(500).json({
            success: false,
            error: 'AI Generation failed',
            message: error.message
        });
    }
};

export const refinePrompt = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            return res.status(400).json({
                success: false,
                error: 'Prompt is required'
            });
        }

        const refinedPrompt = await AiService.generateImagePrompt(prompt);

        return res.json({
            success: true,
            refinedPrompt
        });
    } catch (error: any) {
        return res.status(500).json({
            success: false,
            error: 'AI Refinement failed',
            message: error.message
        });
    }
};

export const generateTagline = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { title, description } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                error: 'Title is required for generating a tagline'
            });
        }

        const tagline = await AiService.generateTagline(title, description);

        return res.json({
            success: true,
            tagline
        });
    } catch (error: any) {
        logger.error('Error in AI generateTagline:', error);
        return res.status(500).json({
            success: false,
            error: 'AI Tagline Generation failed',
            message: error.message
        });
    }
};

export const generateEventDetails = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { motive, brandName, brandBio, eventType, decisionDomain, targetMarket, budget, count, voteOptions } = req.body;

        if (!motive) {
            return res.status(400).json({
                success: false,
                error: 'Motive is required'
            });
        }

        const suggestions = await AiService.generateEventDetails({
            motive,
            brandName: brandName || '',
            brandBio: brandBio || '',
            eventType: eventType || 'vote',
            decisionDomain: decisionDomain || '',
            targetMarket: targetMarket || '',
            budget: budget || '',
            count: Math.min(Math.max(parseInt(count) || 1, 1), 6),
            voteOptions: Math.min(Math.max(parseInt(voteOptions) || 4, 2), 10),
        });

        return res.json({
            success: true,
            suggestions,
        });
    } catch (error: any) {
        logger.error('Error in AI generateEventDetails:', error);
        return res.status(500).json({
            success: false,
            error: 'AI Event Details Generation failed',
            message: error.message
        });
    }
};

export const generateProposals = async (req: Request, res: Response): Promise<Response> => {
    try {
        const { title, description, category, count } = req.body;

        if (!title) {
            return res.status(400).json({
                success: false,
                error: 'Title is required for generating proposals'
            });
        }

        const proposals = await AiService.generateProposals(title, description, category, count);

        return res.json({
            success: true,
            proposals
        });
    } catch (error: any) {
        logger.error('Error in AI generateProposals:', error);
        return res.status(500).json({
            success: false,
            error: 'AI Proposal Generation failed',
            message: error.message
        });
    }
};
