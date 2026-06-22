import express, { Request, Response } from 'express';
import 'dotenv/config';
import cors from 'cors';
import helmet from 'helmet';
import { auth } from './lib/auth.js';
import { toNodeHandler } from 'better-auth/node';
import userRouter from './routes/UserRoute.js';
import projectRouter from './routes/ProjectRoute.js';
import { stripeWebhook } from './Controllers/StripeWebhook.js';

const app = express();

// ─── Security Headers (CS-05) ─────────────────────────────────────────────
// Helmet sets a suite of well-known HTTP security headers in a single call.
//
// Overrides from the defaults:
//   crossOriginResourcePolicy  : 'cross-origin' — lets the Vercel frontend
//     fetch assets served from the Render API without CORP blocks.
//   crossOriginEmbedderPolicy  : false — disabled because:
//     a) Stripe Checkout embeds third-party iframes.
//     b) The AI-generated site previews are cross-origin iframes by design.
//   contentSecurityPolicy      : false on this API server — CSP is more
//     meaningful on the HTML-serving frontend (Vercel) where user content
//     is rendered. Enabling it here would require allow-listing every
//     external AI / Pexels / Stripe domain used by generated pages.
//
// All other helmet defaults remain active, including:
//   X-DNS-Prefetch-Control, X-Frame-Options (SAMEORIGIN), X-XSS-Protection,
//   Strict-Transport-Security (HSTS), X-Content-Type-Options (noSniff),
//   and X-Powered-By removal.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

// ─── CORS ──────────────────────────────────────────────────────────────────
// Helmet must come before cors() — helmet sets the security headers first,
// then cors() overlays its own Access-Control-* headers on top.
// 1. Configure CORS first
const corsOptions = {
    
    origin: ['http://localhost:5173', ...(process.env.TRUSTED_ORIGINS?.split(',') || [])],
    credentials: true,
};

app.use(cors(corsOptions));
app.post('/api/stripe',express.raw({type:'application/json'}),stripeWebhook)

app.all('/api/auth/*splat', toNodeHandler(auth));

// 3. Mount Body Parser AFTER Better Auth
app.use(express.json({ limit: '50mb' }));

// 4. Standard Routes
app.get('/', (req: Request, res: Response) => {
    res.send('Express + TypeScript server running 🚀');
});

app.use('/api/user', userRouter);
app.use('/api/project', projectRouter);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});