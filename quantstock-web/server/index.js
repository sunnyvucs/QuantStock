import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import apiRouter from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ──────────────────────────────────────────────────────────────
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    /\.vercel\.app$/,
  ],
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Routes ──────────────────────────────────────────────────────────────────
app.use('/api', apiRouter);

app.get('/health', (_, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// ─── Error handler ───────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const server = app.listen(PORT, () => {
  console.log(`QuantStock server running on http://localhost:${PORT}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    const fallback = Number(PORT) + 1;
    console.warn(`Port ${PORT} in use, trying ${fallback}…`);
    server.close();
    app.listen(fallback, () => {
      console.log(`QuantStock server running on http://localhost:${fallback}`);
    });
  } else {
    throw err;
  }
});

// Graceful shutdown — prevents Windows "Terminate batch job (Y/N)?" prompt
function shutdown(signal) {
  console.log(`\n[${signal}] Shutting down QuantStock server…`);
  server.close(() => {
    console.log('Server closed. Goodbye.');
    process.exit(0);
  });
  // Force-exit after 3 s if connections keep the server alive
  setTimeout(() => process.exit(0), 3000).unref();
}

process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

export default app;
