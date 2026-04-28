import './env.js';
import logger from './lib/logger.js';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import routes from './routes/index.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFound } from './middlewares/notFound.js';

export const createApp = () => {
    const app = express();

    // Middleware
    app.use(helmet());
    app.use(cors({
        origin: (origin, callback) => {
            const allowedOrigins = [
                'http://localhost:3000',
                'http://localhost:3001',
                'https://aris-demo.vercel.app',
                'https://arisweb-demo.vercel.app',
                'http://www.aristhrottle.org',
                'https://www.aristhrottle.org',
                'https://aristhrottle.org',
                'http://aristhrottle.org',
                process.env.FRONTEND_URL,
            ].filter(Boolean);

            if (!origin || allowedOrigins.includes(origin) || allowedOrigins.some(o => origin.startsWith(o!))) {
                callback(null, true);
            } else {
                logger.warn(`CORS blocked for origin: ${origin}`);
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true
    }));
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
