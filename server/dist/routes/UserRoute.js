import express from 'express';
import { CreateUserProject, getConversation, getUserAllProjects, getUserCredits, getUserProject, purchaseCredits, toggleProjectPublish } from '../Controllers/UserController.js';
import { protect } from '../Middlewares/auth.js';
import { aiLimiter, purchaseLimiter } from '../Middlewares/rateLimiter.js';
const userRouter = express.Router();
// ─── Read-only / lightweight routes — no rate limiting ───────────────────────
userRouter.get('/credits', protect, getUserCredits);
userRouter.get('/project/:projectId', protect, getUserProject);
userRouter.get('/projects', protect, getUserAllProjects);
userRouter.put('/publish-toggle/:projectId', protect, toggleProjectPublish);
userRouter.get('/convo/:projectId', protect, getConversation);
// ─── AI generation — rate-limited to 5 requests per user per minute ──────────
userRouter.post('/project', protect, aiLimiter, CreateUserProject);
// ─── Stripe purchase — rate-limited to 3 requests per user per minute ────────
userRouter.post('/purchase-credits', protect, purchaseLimiter, purchaseCredits);
export default userRouter;
