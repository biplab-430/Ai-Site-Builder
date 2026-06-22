import rateLimit from 'express-rate-limit';
/**
 * Rate limiter for AI generation endpoints.
 *
 * Limits: 5 requests per 60-second rolling window.
 *
 * Key strategy — keyed by the authenticated userId (injected onto req by the
 * `protect` middleware) rather than by raw IP address. This prevents false
 * positives for users on shared corporate NAT or proxies where many different
 * accounts emerge from a single public IP, while still enforcing a strong
 * per-account cap against abuse.
 *
 * Falls back to req.ip if userId is somehow absent (e.g. a request that
 * bypassed the protect middleware), and to 'anonymous' as a last resort.
 *
 * Applied to:
 *   POST /api/user/project            → CreateUserProject
 *   POST /api/project/revision/:id    → makeRevision
 */
export const aiLimiter = rateLimit({
    windowMs: 60 * 1000, // 1-minute rolling window
    max: 5, // 5 generation requests per user per window
    standardHeaders: 'draft-7', // Emit RFC-compliant RateLimit-* response headers
    legacyHeaders: false, // Suppress deprecated X-RateLimit-* headers
    // Key by authenticated userId set by the protect middleware.
    keyGenerator: (req) => req.userId ?? req.ip ?? 'anonymous',
    handler: (_req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many generation requests. Please wait a minute and try again.',
        });
    },
});
/**
 * Rate limiter for the Stripe purchase-credits endpoint.
 *
 * Limits: 3 requests per 60-second rolling window.
 * Prevents a malicious actor from flooding the Transaction table with
 * orphaned records or triggering excessive Stripe session creation.
 *
 * Applied to:
 *   POST /api/user/purchase-credits   → purchaseCredits
 */
export const purchaseLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 3,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    keyGenerator: (req) => req.userId ?? req.ip ?? 'anonymous',
    handler: (_req, res) => {
        res.status(429).json({
            success: false,
            message: 'Too many purchase requests. Please wait a minute and try again.',
        });
    },
});
