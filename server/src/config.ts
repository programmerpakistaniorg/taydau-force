import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

function requireEnv(key: string, fallback?: string): string {
  const val = process.env[key] ?? fallback;
  if (!val) throw new Error(`Missing required env var: ${key}`);
  return val;
}

function parsePricing(): Record<string, { inputPer1M: number; outputPer1M: number }> {
  const pricing: Record<string, { inputPer1M: number; outputPer1M: number }> = {};
  // Scan env for PRICING_*_INPUT and PRICING_*_OUTPUT pairs
  for (const [key, value] of Object.entries(process.env)) {
    const inputMatch = key.match(/^PRICING_(.+)_INPUT$/);
    if (inputMatch && value) {
      const modelKey = inputMatch[1].toLowerCase().replace(/_/g, '-');
      const outputKey = `PRICING_${inputMatch[1]}_OUTPUT`;
      const outputVal = process.env[outputKey];
      if (outputVal) {
        const inPrice = parseFloat(value);
        const outPrice = parseFloat(outputVal);
        if (isNaN(inPrice) || isNaN(outPrice) || inPrice < 0 || outPrice < 0) {
          throw new Error(`Invalid pricing configuration for ${key} / ${outputKey}: must be non-negative numbers.`);
        }
        pricing[modelKey] = {
          inputPer1M: inPrice,
          outputPer1M: outPrice,
        };
      }
    }
  }
  return pricing;
}

function parseBudgetHardLimit(): number {
  const raw = process.env.BUDGET_HARD_LIMIT_USD ?? '5.00';
  const val = parseFloat(raw);
  if (isNaN(val) || val <= 0) {
    throw new Error(`Invalid BUDGET_HARD_LIMIT_USD: '${raw}'. Must be a positive numeric value.`);
  }
  return val;
}

function parsePort(): number {
  const raw = process.env.PORT ?? '3001';
  const val = parseInt(raw, 10);
  if (isNaN(val) || val <= 0 || val > 65535) {
    throw new Error(`Invalid PORT: '${raw}'. Must be a valid port number between 1 and 65535.`);
  }
  return val;
}

// Provider selection — computed before the config object so both sections can reference it.
const modelProvider = requireEnv('MODEL_PROVIDER');

export const config = {
  modelProvider,

  alibaba: modelProvider === 'alibaba' || modelProvider === 'qwen'
    ? {
        apiKey: requireEnv('ALIBABA_API_KEY'),
        baseUrl: requireEnv('ALIBABA_BASE_URL'),
        workspaceId: process.env.ALIBABA_WORKSPACE_ID || '',
      }
    : { apiKey: '', baseUrl: '', workspaceId: '' },

  groq: modelProvider === 'groq'
    ? {
        apiKey: requireEnv('GROQ_API_KEY'),
        baseUrl: requireEnv('GROQ_BASE_URL', 'https://api.groq.com/openai/v1'),
      }
    : { apiKey: '', baseUrl: '' },

  models: modelProvider === 'groq'
    ? {
        ba: requireEnv('GROQ_BA_MODEL', 'qwen/qwen3.8-27b'),
        pm: requireEnv('GROQ_PM_MODEL', 'openai/gpt-oss-20b'),
        architect: requireEnv('GROQ_ARCHITECT_MODEL', 'openai/gpt-oss-120b'),
        engineer: requireEnv('GROQ_ENGINEER_MODEL', 'qwen/qwen3.8-27b'),
        qa: requireEnv('GROQ_QA_MODEL', 'openai/gpt-oss-120b'),
      }
    : {
        ba: requireEnv('QWEN_BA_MODEL', 'qwen-plus'),
        pm: requireEnv('QWEN_PM_MODEL', 'qwen-plus'),
        architect: requireEnv('QWEN_ARCHITECT_MODEL', 'qwen-max'),
        engineer: requireEnv('QWEN_ENGINEER_MODEL', 'qwen-max'),
        qa: requireEnv('QWEN_QA_MODEL', 'qwen-plus'),
      },

  pricing: parsePricing(),
  database: {
    url: requireEnv('DATABASE_URL', 'postgresql://taydau:taydau@localhost:5432/taydau'),
  },
  budget: {
    hardLimitUsd: parseBudgetHardLimit(),
  },
  port: parsePort(),
} as const;

