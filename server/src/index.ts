import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import projectsRouter from './routes/projects.js';

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

// API routes
app.use('/api/projects', projectsRouter);

// Error handler (must be last)
app.use(errorHandler);

app.listen(config.port, async () => {
  console.log(`[startup] TayDau Force server running on port ${config.port}`);
  console.log(`[startup] Active Model Provider: ${config.modelProvider.toUpperCase()}`);
  console.log(`[startup] Canonical Specialist Workforce Models:`);
  console.log(`  - Aria Analyst (BA):           ${config.models.ba}`);
  console.log(`  - Marcus Planner (PM):         ${config.models.pm}`);
  console.log(`  - Sofia Designer (UI/UX):      ${config.models.designer}`);
  console.log(`  - Arthur Blueprint (Architect): ${config.models.architect}`);
  console.log(`  - Devon Coder (Engineer):      ${config.models.engineer}`);
  console.log(`  - Dr. Evelyn (Code Reviewer):  ${config.models.codeReview}`);
  console.log(`  - Quinn Tester (QA Engineer):  ${config.models.qa}`);

  try {
    await query('SELECT 1');
    console.log(`[startup] Database connectivity verified.`);
  } catch (err: any) {
    console.error(`[startup] WARNING: Database connection failed:`, err.message);
  }
});

export default app;
