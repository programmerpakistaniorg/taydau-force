import { ExperientialAdapter } from '../src/gateway/providers/experiential-adapter.js';
import { providerAdapters } from '../src/gateway/providers/provider-registry.js';
import { config } from '../src/config.js';

async function main() {
  console.log('======================================================================');
  console.log('EXPERIENTIAL LABS LIVE INFERENCE COMPLETION TEST');
  console.log('======================================================================');
  console.log('[Target Provider]: experiential');
  console.log('[API Key Configured]:', config.experiential.apiKey ? 'YES' : 'NO');

  const preflightList = await providerAdapters.getProviderPreflightReport();
  const expPreflight = preflightList.find(p => p.providerId === 'experiential');
  console.log('[Preflight Connection]:', expPreflight?.connection);
  console.log('[Models Discovered]:', expPreflight?.callableModelsCount);

  const adapter = new ExperientialAdapter();
  const modelsToTest = ['qwen3.8-27b', 'deepseek-v4-flash', 'gpt-5.6-luna'];

  for (const modelId of modelsToTest) {
    console.log('\n--- Testing Live Inference: ' + modelId + ' ---');
    try {
      const res = await adapter.execute(
        modelId,
        [
          { role: 'system', content: 'You are an autonomous AI specialist in TayDau Force. Keep responses brief.' },
          { role: 'user', content: 'In one short sentence: What is TayDau Force?' }
        ],
        {
          maxTokens: 60,
          temperature: 0.1,
          responseFormatJson: false,
          idempotencyKey: 'live-test-' + modelId + '-' + Date.now()
        }
      );

      console.log('[SUCCESS] ' + modelId + ' Output:');
      console.log(res.content.trim());
      console.log('[Usage Tokens]: In=' + res.inputTokens + ' Out=' + res.outputTokens);
    } catch (err: any) {
      console.log('[FAILED] ' + modelId + ':', err.message);
    }
  }

  console.log('\n======================================================================');
  console.log('LIVE INFERENCE AUDIT COMPLETED');
  console.log('======================================================================');
}

main().catch(err => {
  console.error('Fatal execution error:', err.message);
  process.exit(1);
});
