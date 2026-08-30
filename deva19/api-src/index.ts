import express from 'express';
import dotenv from 'dotenv';
import { apiRouter } from '../server/routes';

dotenv.config();

const app = express();

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', name: 'Devaraj Crackers API', timestamp: new Date().toISOString() });
});

app.use('/api', apiRouter);

// Global error handler: catches any error thrown or forwarded via next(err)
// from the routes above (including async ones via asyncHandler) and returns
// a clean JSON 500 instead of letting the serverless function crash with a
// bare, unhandled error.
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled API error:', err);
  if (res.headersSent) {
    return next(err);
  }
  res.status(500).json({
    error: 'Something went wrong on our end. Please try again in a moment.',
    detail: process.env.NODE_ENV === 'production' ? undefined : (err?.message || String(err)),
  });
});

// Vercel invokes this as a request handler (Express apps are callable as (req, res))
export default app;
