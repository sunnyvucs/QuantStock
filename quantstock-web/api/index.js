import express from 'express';
import cors from 'cors';
import apiRouter from '../server/routes/api.js';

const app = express();

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Mount at both /api (Vercel passes full path) and / (fallback)
app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
