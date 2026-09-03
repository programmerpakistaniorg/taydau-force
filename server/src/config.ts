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

// Provider selection: 'tabi' (default) or 'groq'
const modelProvider = process.env.MODEL_PROVIDER || 'tabi';

export const config = {
  modelProvider,

  tabi: {
    apiKey: process.env.TABI_API_KEY || '',
    baseUrl: process.env.TABI_BASE_URL || 'https://tabitoken.com/v1',
  },

  groq: {
    apiKey: process.env.GROQ_API_KEY || '',
    baseUrl: process.env.GROQ_BASE_URL || 'https://api.groq.com/openai/v1',
  },

  models: modelProvider === 'groq'
    ? {
        ba: process.env.GROQ_BA_MODEL || 'qwen/qwen3.8-27b',
        pm: process.env.GROQ_PM_MODEL || 'qwen/qwen3.8-27b',
        designer: process.env.GROQ_DESIGNER_MODEL || 'qwen/qwen3.8-27b',
        architect: process.env.GROQ_ARCHITECT_MODEL || 'qwen/qwen3.8-27b',
        engineer: process.env.GROQ_ENGINEER_MODEL || 'qwen/qwen3.8-27b',
        codeReview: process.env.GROQ_CODE_REVIEW_MODEL || 'qwen/qwen3.8-27b',
        qa: process.env.GROQ_QA_MODEL || 'qwen/qwen3.8-27b',
      }
    : {
        // Tabi AI: Normal agents use claude-opus-5, Coding/Architecture/Security/QA use claude-opus-5-thinking
        ba: process.env.TABI_BA_MODEL || 'claude-opus-5',
        pm: process.env.TABI_PM_MODEL || 'claude-opus-5',
        designer: process.env.TABI_DESIGNER_MODEL || 'claude-opus-5-thinking',
        architect: process.env.TABI_ARCHITECT_MODEL || 'claude-opus-5-thinking',
        engineer: process.env.TABI_ENGINEER_MODEL || 'claude-opus-5-thinking',
        codeReview: process.env.TABI_CODE_REVIEW_MODEL || 'claude-opus-5-thinking',
        qa: process.env.TABI_QA_MODEL || 'claude-opus-5-thinking',
      },

  groqModels: {
    ba: process.env.GROQ_BA_MODEL || 'qwen/qwen3.8-27b',
    pm: process.env.GROQ_PM_MODEL || 'qwen/qwen3.8-27b',
    designer: process.env.GROQ_DESIGNER_MODEL || 'qwen/qwen3.8-27b',
    architect: process.env.GROQ_ARCHITECT_MODEL || 'qwen/qwen3.8-27b',
    engineer: process.env.GROQ_ENGINEER_MODEL || 'qwen/qwen3.8-27b',
    codeReview: process.env.GROQ_CODE_REVIEW_MODEL || 'qwen/qwen3.8-27b',
    qa: process.env.GROQ_QA_MODEL || 'qwen/qwen3.8-27b',
  },

  pricing: parsePricing(),
  database: {
    url: requireEnv('DATABASE_URL', 'postgresql://taydau:taydau@localhost:5432/taydau'),
  },
  budget: {
    hardLimitUsd: parseBudgetHardLimit(),
  },
  port: parsePort(),
};
