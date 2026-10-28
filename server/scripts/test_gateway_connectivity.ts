import { z } from 'zod';
import { createGateway } from '../src/gateway/provider-factory.js';

const TestSchema = z.object({
  status: z.string(),
  message: z.string(),
});

async function test() {
  try {
    const g = createGateway();
    console.log('[Test] Gateway initialized successfully.');
    const res = await g.call({
      modelId: 'openai/gpt-oss-20b',
      systemPrompt: 'You are a test assistant. Always output JSON matching the schema.',
      userPrompt: 'Output status ok and message hello from AI',
      responseSchema: TestSchema,
      projectId: 'test-project-001',
      agentRole: 'ba',
    });
    console.log('[Test] Gateway parsed:', res.parsed);
    console.log('[Test] Model used:', res.modelId);
    console.log('[Test] Provider:', res.provider);
    console.log('[Test] Usage:', res.usage);
  } catch (err: any) {
    console.error('[Test] Gateway Error:', err.message || err);
  }
}

test();
