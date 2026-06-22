import express from 'express';
import { protect } from '../Middlewares/auth.js';
import { deleteProject, getProjectById, getProjectPreview, getPublishProject, makeRevision, rollBackToVersion, saveProjectCode } from '../Controllers/ProjectController.js';
import { aiLimiter } from '../Middlewares/rateLimiter.js';

const projectRouter = express.Router();

// ─── AI revision — rate-limited to 5 requests per user per minute ────────────
projectRouter.post('/revision/:projectId',       protect, aiLimiter,   makeRevision);

// ─── Project management — no rate limiting ───────────────────────────────────
projectRouter.put('/save/:projectId',             protect,              saveProjectCode);
projectRouter.put('/rollback/:projectId/:versionId', protect,          rollBackToVersion);
projectRouter.delete('/delete/:projectId',        protect,              deleteProject);
projectRouter.get('/preview/:projectId',          protect,              getProjectPreview);

// ─── Public community routes — unauthenticated, no rate limiting ─────────────
projectRouter.get('/published',                                         getPublishProject);
projectRouter.get('/published/:projectId',                              getProjectById);

export default projectRouter;