import express, { Request, Response } from 'express';
import 'dotenv/config';
import cors from 'cors';
import { auth } from './lib/auth.js';
import { toNodeHandler } from 'better-auth/node';
import userRouter from './routes/UserRoute.js';
import projectRouter from './routes/ProjectRoute.js';

const app = express();

// 1. Configure CORS first
const corsOptions = {
   
    origin: ['http://localhost:5173', ...(process.env.TRUSTED_ORIGINS?.split(',') || [])],
    credentials: true,
};

app.use(cors(corsOptions));

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