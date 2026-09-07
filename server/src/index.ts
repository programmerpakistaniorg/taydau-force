import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import projectsRouter from './routes/projects.js';
import { LivePreviewManager } from './services/live-preview-manager.js';
import { query } from './db/pool.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', async (_req, res) => {
  try {
    await query('SELECT 1');
    res.json({
      status: 'ok',
      provider: config.modelProvider,
      models: config.models,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    res.status(503).json({ status: 'degraded', error: err.message });
  }
});

// Quota & Admission Control Diagnostic Snapshot (internal/dev admin protected)
app.get('/api/quota/snapshot', async (req, res) => {
  const isDevelopment = process.env.NODE_ENV !== 'production';
  const isLoopback =
    req.ip === '127.0.0.1' ||
    req.ip === '::1' ||
    req.ip === '::ffff:127.0.0.1' ||
    req.hostname === 'localhost';

  const adminSecret = process.env.TAYDAU_ADMIN_SECRET;
  const authHeader = req.headers['x-taydau-admin-token'] || req.headers['authorization'];
  const hasValidAuth = Boolean(
    adminSecret &&
    adminSecret.length > 0 &&
    (authHeader === `Bearer ${adminSecret}` || authHeader === adminSecret)
  );

  // In development: allow local loopback or valid admin token.
  // In production: strictly require valid admin token regardless of loopback (prevents reverse-proxy localhost bypass).
  const isAuthorized = isDevelopment ? (isLoopback || hasValidAuth) : hasValidAuth;

  if (!isAuthorized) {
    return res.status(403).json({
      error: 'Forbidden: /api/quota/snapshot is restricted to authorized administrative inspection',
    });
  }

  const { quotaGovernor } = await import('./gateway/quota-governor.js');
  const { providerHealth } = await import('./gateway/routing-registry.js');
  res.json({
    quotaSnapshot: quotaGovernor.getSanitizedSnapshot(),
    healthStates: providerHealth.getAllQuotaStates(),
    timestamp: new Date().toISOString(),
  });
});

// API routes
app.use('/api/projects', projectsRouter);
app.use('/projects', projectsRouter);

// Error handler (must be last)
app.use(errorHandler);

app.listen(config.port, async () => {
  console.log(`[startup] TayDau Force server running on port ${config.port}`);
  console.log(`[startup] Dynamic Model Routing: ENABLED (Policy Version: v2.0.0-free-resilience)`);
  console.log(`[startup] Inference Billing Mode: ${config.inferenceBillingMode || 'FREE_ONLY'}`);
  console.log(`[startup] Provider Pool: Groq, Google AI Studio, NVIDIA NIM, Mistral, OpenRouter, Experiential Labs`);
  console.log(`[startup] Local Semantic Resilience: llama.cpp GGUF Fallback + Internal Wireframe Engine`);

  try {
    await query('SELECT 1');
    console.log(`[startup] Database connectivity verified.`);
    await LivePreviewManager.reconcileOrphans();
    LivePreviewManager.initReaper();
  } catch (err: any) {
    console.error(`[startup] WARNING: Database connection failed:`, err.message);
  }
});

export default app;
