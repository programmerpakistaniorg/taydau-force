import { ExperientialAdapter } from '../src/gateway/providers/experiential-adapter.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let passed = 0;
let total = 0;

function assert(condition: boolean, msg: string) {
  total++;
  if (condition) {
    passed++;
    console.log(`  [PASS] ${msg}`);
  } else {
    console.error(`  [FAIL] ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runSecretAudit() {
  console.log('======================================================================');
  console.log('TAYDAU FORCE — END-TO-END SYNTHETIC SECRET LEAK AUDIT');
  console.log('======================================================================\n');

  const SYNTHETIC_SECRET = 'xpl_synthetic_test_secret_key_8899aabbccddeeff';
  const adapter = new ExperientialAdapter();

  // 1. Error message sanitization audit
  console.log('--- 1. ERROR MESSAGE REDACTION AUDIT ---');
  const rawErrors = [
    `Authentication failed for token ${SYNTHETIC_SECRET}`,
    `HTTP 401: Invalid Bearer ${SYNTHETIC_SECRET} in Authorization header`,
    `Payload: {"apiKey": "${SYNTHETIC_SECRET}", "model": "qwen3.8-27b"}`,
    `xpl_test_alpha_123 rejected by gateway`,
  ];

  for (const raw of rawErrors) {
    const parsed = adapter.parseError({ status: 401, message: raw });
    assert(!parsed.message.includes(SYNTHETIC_SECRET), `Synthetic secret stripped from error: "${raw.slice(0, 30)}..."`);
    assert(!parsed.message.includes('xpl_test_alpha_123'), 'Generic xpl_ key pattern sanitized');
  }

  // 2. .env.example audit
  console.log('\n--- 2. .env.example CLEANLINESS AUDIT ---');
  const envExamplePath = path.resolve(__dirname, '../.env.example');
  assert(fs.existsSync(envExamplePath), '.env.example exists');
  const envExampleContent = fs.readFileSync(envExamplePath, 'utf8');
  assert(!envExampleContent.includes('xpl_'), '.env.example contains zero xpl_ tokens');
  const explabsLine = envExampleContent.split('\n').find(l => l.startsWith('EXPLABS_API_KEY'));
  assert(explabsLine !== undefined && explabsLine.trim() === 'EXPLABS_API_KEY=', '.env.example has EXPLABS_API_KEY= with empty value');

  // 3. Preflight output audit
  console.log('\n--- 3. PREFLIGHT DIAGNOSTICS AUDIT ---');
  const preflightKeys = Object.keys(adapter);
  assert(!preflightKeys.includes('apiKey'), 'apiKey is not an enumerable property on ExperientialAdapter instance');

  // 4. Source code files secret leak audit (excluding raw search patterns)
  console.log('\n--- 4. REPOSITORY COMMITTED CODE AUDIT ---');
  const filesToCheck = [
    '../src/config.ts',
    '../src/gateway/providers/experiential-adapter.ts',
    '../src/gateway/providers/provider-registry.ts',
    '../src/gateway/routing-registry.ts',
    '../src/gateway/routed-gateway.ts',
  ];

  for (const rel of filesToCheck) {
    const full = path.resolve(__dirname, rel);
    if (fs.existsSync(full)) {
      const code = fs.readFileSync(full, 'utf8');
      assert(!code.includes('xpl_live_'), `${rel} contains zero live secret tokens`);
    }
  }

  console.log('\n======================================================================');
  console.log(`SECRET AUDIT SUMMARY: ${passed} / ${total} ASSERTIONS PASSED (100%)`);
  console.log('======================================================================\n');
}

runSecretAudit().catch(err => {
  console.error('[FATAL AUDIT ERROR]:', err);
  process.exit(1);
});
