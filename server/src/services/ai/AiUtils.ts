import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';

dotenv.config();

export class AiUtils {
    public static genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    public static PINATA_JWT = process.env.PINATA_JWT || '';

    /**
     * Get a generative model instance
     * @param modelName Name of the model (e.g., "gemini-2.5-flash", "imagen-3.0-generate-001")
     */
    static getModel(modelName: string = "gemini-2.5-flash") {
        return this.genAI.getGenerativeModel({ model: modelName });
    }
}
