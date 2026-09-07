import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function runLiveDiscovery() {
  const apiKey = process.env.EXPLABS_API_KEY;
  const baseUrl = process.env.EXPLABS_BASE_URL || 'https://api.experientiallabs.ai/v1';

  console.log('======================================================================');
  console.log('EXPERIENTIAL LABS LIVE AUTHENTICATED DISCOVERY AUDIT');
  console.log('======================================================================\n');
  console.log(`[Target URL]: ${baseUrl}/models`);
  console.log(`[API Key Configured]: ${Boolean(apiKey && apiKey.length > 5) ? 'YES (Key Present)' : 'NO'}`);

  if (!apiKey) {
    console.error('[ERROR] EXPLABS_API_KEY not configured in server/.env');
    process.exit(1);
  }

  const startTime = Date.now();
  try {
    const res = await fetch(`${baseUrl}/models`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'TayDau-Force-Discovery/1.0',
        'X-Title': 'TayDau Force Live Discovery',
      },
      signal: AbortSignal.timeout(15_000),
    });

    const latencyMs = Date.now() - startTime;
    console.log(`[HTTP Status]: ${res.status} ${res.statusText}`);
    console.log(`[Latency]: ${latencyMs}ms`);

    if (!res.ok) {
      const errText = await res.text();
      console.error(`[Discovery Error Payload]: ${errText.replace(/xpl_[A-Za-z0-9_\-]+/gi, 'xpl_[REDACTED]')}`);
      process.exit(1);
    }

    const data = (await res.json()) as any;
    const modelList = data.data || [];
    console.log(`[Total Callable Models Returned]: ${modelList.length}`);

    console.log('\n--- MODEL LIST DISCOVERY ---');
    const slugs: string[] = [];
    for (const m of modelList) {
      const id = m.id || m.name;
      slugs.push(id);
      console.log(`  - ${id} (owned_by: ${m.owned_by || 'unknown'}, context: ${m.context_window || m.context_length || 'N/A'})`);
    }

    // Check specific candidate slugs (e.g. Qwen 3.8, DeepSeek, GPT-5.6 Luna, GPT-6 Astra, Claude Fable)
    console.log('\n--- TARGET SLUG MATCHING ---');
    const targetKeywords = ['qwen', 'deepseek', 'gpt-5.6', 'gpt-6', 'fable', 'luna', 'astra'];
    for (const kw of targetKeywords) {
      const matches = slugs.filter(s => s.toLowerCase().includes(kw));
      console.log(`  Matches for "${kw}": ${matches.length > 0 ? matches.join(', ') : 'NONE'}`);
    }

  } catch (err: any) {
    console.error(`[Fetch Exception]: ${err.message}`);
    process.exit(1);
  }
}

runLiveDiscovery();
