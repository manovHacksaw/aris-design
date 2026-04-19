import logger from '../../lib/logger.js';
import axios from 'axios';
import FormData from 'form-data';
import { AiUtils } from './AiUtils.js';

export class AiImageService {
    /**
     * Generate an image using Gemini's image generation capabilities (Imagen)
     */
    static async generateImage(prompt: string): Promise<{ base64: string, buffer: Buffer }> {
        try {
            logger.info({ prompt }, 'Generating image for prompt:');
            const model = AiUtils.getModel("imagen-3.0-generate-001");
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
            logger.error(error, 'Error generating image:');
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
                    'Authorization': `Bearer ${AiUtils.PINATA_JWT}`,
                    ...formData.getHeaders()
                }
            });

            return response.data.IpfsHash;
        } catch (error: any) {
            logger.error({ err: error.response?.data || error.message }, 'Pinata upload error:');
            throw new Error('Failed to upload generated image to IPFS');
        }
    }
}
