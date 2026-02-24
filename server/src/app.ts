import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from './routes';
import { errorHandler } from './middlewares/errorHandler';
import { notFound } from './middlewares/notFound';

export const createApp = () => {
    const app = express();

    // Middleware
    app.use(helmet());
    app.use(cors({
        origin: [
            'http://localhost:3000',
            'https://aris-demo.vercel.app',
            process.env.FRONTEND_URL || ''
        ].filter(Boolean),
        credentials: true
    }));
    app.use(morgan('dev'));
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // API Routes
    console.log('Mounting API routes at /api');
    app.use('/api', routes);

    // Error handling middleware (must be last)
    app.use(errorHandler);

    // 404 handler (must be after all routes)
    app.use(notFound);

    return app;
};
