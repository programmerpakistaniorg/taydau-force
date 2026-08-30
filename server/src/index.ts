import express from 'express';
import cors from 'cors';
import { config } from './config.js';
import { errorHandler } from './middleware/error-handler.js';
import projectsRouter from './routes/projects.js';

const app = express();

app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/projects', projectsRouter);

// Error handler (must be last)
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`TayDau Force server running on port ${config.port}`);
});

export default app;
