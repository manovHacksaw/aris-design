import './env';
import logger from './lib/logger';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';

export const createApp = () => {
    const app = express();

    // Middleware
    app.use(helmet({
        crossOriginResourcePolicy: false, // Allow cross-origin resources
    }));

    app.use(cors({
        origin: (origin, callback) => {
            const allowedOrigins = [
                'http://localhost:3000',
                'http://localhost:3001',
                'https://aris-demo.vercel.app',
                'https://arisweb-demo.vercel.app',
                'https://www.aristhrottle.org',
                'https://aristhrottle.org',
                'http://www.aristhrottle.org',
                'http://aristhrottle.org',
            ];

            // In production, also allow any subdomain of vercel.app or aristhrottle.org
            const isAllowed = !origin || 
                allowedOrigins.includes(origin) || 
                allowedOrigins.some(o => origin.startsWith(o)) ||
                (origin.endsWith('.vercel.app') || origin.endsWith('aristhrottle.org'));

            if (isAllowed) {
                callback(null, true);
            } else {
                logger.warn(`CORS blocked for origin: ${origin}`);
                callback(null, false); // Don't throw error, just don't allow
            }
        },
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-test-user-id', 'Accept'],
        preflightContinue: false,
        optionsSuccessStatus: 204
    }));
    
    // Explicitly handle OPTIONS for all routes just in case
    app.options('*', cors() as any);
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // API Routes
    logger.info('Mounting API routes at /api');
    app.use('/api', routes);

    // Error handling middleware (must be last)
    app.use(errorHandler);

    // 404 handler (must be after all routes)
    app.use(notFound);

    return app;
};
