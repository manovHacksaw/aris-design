import { Request, Response } from 'express';
import { AiService } from '../services/aiService';

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
            console.warn('Image generation failed, returning refined prompt only:', genError.message);
            return res.json({
                success: true,
                refinedPrompt,
                imageGenError: genError.message,
                message: 'Prompt refined, but image generation failed. ' + genError.message
            });
        }
    } catch (error: any) {
        console.error('Error in AI generateImage:', error);
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
        console.error('Error in AI generateProposals:', error);
        return res.status(500).json({
            success: false,
            error: 'AI Proposal Generation failed',
            message: error.message
        });
    }
};
