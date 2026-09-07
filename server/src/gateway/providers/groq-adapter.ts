import { config } from '../../config.js';
import type { QuotaSignal, NormalizedQuotaSignal } from '../../schemas/quota.js';
import {
  ChatMessage,
  ParsedProviderError,
  ProviderAdapter,
  ProviderExecutionOptions,
  ProviderExecutionResult,
} from './provider-adapter.interface.js';

function parseResetTimeMs(str?: string): number {
  if (!str) return 60_000;
  const matchMs = str.match(/^([\d\.]+)ms$/);
  if (matchMs) return parseFloat(matchMs[1]);
  const matchS = str.match(/^([\d\.]+)s$/);
  if (matchS) return parseFloat(matchS[1]) * 1000;
  const matchM = str.match(/^(\d+)m(?:(\d+)s)?$/);
  if (matchM) {
    const mins = parseInt(matchM[1], 10);
    const secs = matchM[2] ? parseInt(matchM[2], 10) : 0;
    return (mins * 60 + secs) * 1000;
  }
  const num = parseFloat(str);
  if (!isNaN(num)) return num * 1000;
  return 60_000;
}

export class GroqAdapter implements ProviderAdapter {
  readonly providerId = 'groq';
  readonly trustLevel = 'VERIFIED_INFERENCE_PLATFORM' as const;
  readonly defaultBilling = 'FREE_TIER' as const;

  isConfigured(): boolean {
    return Boolean(config.groq.apiKey && config.groq.apiKey.trim().length > 0);
  }

  async listModels(): Promise<string[]> {
    if (!this.isConfigured()) return [];
    try {
      const url = `${config.groq.baseUrl}/models`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${config.groq.apiKey}`,
          'User-Agent': 'TayDau-Force/1.0',
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) return [];
      const data = (await res.json()) as any;
      return (data.data || []).map((m: any) => m.id);
    } catch {
      return [];
    }
  }

  async validateConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, error: 'GROQ_API_KEY is not configured in environment.' };
    }
    try {
      const models = await this.listModels();
      if (models.length > 0) return { ok: true };
      return { ok: false, error: 'Could not fetch models from Groq API.' };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  extractNormalizedQuotaSignals(
    headers?: Headers | Record<string, string>,
    modelId?: string,
    error?: any
  ): NormalizedQuotaSignal[] {
    const rawHeaders: Record<string, string> = {};
    if (headers) {
      if (typeof (headers as any).entries === 'function') {
        for (const [k, v] of (headers as any).entries()) {
          rawHeaders[k.toLowerCase()] = v;
        }
      } else {
        for (const [k, v] of Object.entries(headers)) {
          rawHeaders[k.toLowerCase()] = String(v);
        }
      }
    }

    const now = Date.now();
    const source = error ? 'PROVIDER_ERROR_SIGNAL' : (Object.keys(rawHeaders).length > 0 ? 'LIVE_RESPONSE_HEADER' : 'STATIC_FALLBACK');
    const signals: NormalizedQuotaSignal[] = [];

    // 1. Organization RPM signal
    const remainingRequests = rawHeaders['x-ratelimit-remaining-requests'] ? parseInt(rawHeaders['x-ratelimit-remaining-requests'], 10) : undefined;
    const limitRequests = rawHeaders['x-ratelimit-limit-requests'] ? parseInt(rawHeaders['x-ratelimit-limit-requests'], 10) : undefined;
    const resetRequestsMs = parseResetTimeMs(rawHeaders['x-ratelimit-reset-requests']);

    if (remainingRequests !== undefined || limitRequests !== undefined) {
      signals.push({
        provider: 'groq',
        scope: 'ORGANIZATION',
        scopeId: 'org:groq',
        dimension: 'RPM',
        limit: limitRequests,
        remaining: remainingRequests,
        resetAt: now + resetRequestsMs,
        source,
        observedAt: now,
      });
    }

    // 2. Model TPM signal
    const remainingTokens = rawHeaders['x-ratelimit-remaining-tokens'] ? parseInt(rawHeaders['x-ratelimit-remaining-tokens'], 10) : undefined;
    const limitTokens = rawHeaders['x-ratelimit-limit-tokens'] ? parseInt(rawHeaders['x-ratelimit-limit-tokens'], 10) : undefined;
    const resetTokensMs = parseResetTimeMs(rawHeaders['x-ratelimit-reset-tokens']);

    if ((remainingTokens !== undefined || limitTokens !== undefined) && modelId) {
      signals.push({
        provider: 'groq',
        scope: 'MODEL',
        scopeId: `model:groq/${modelId}`,
        dimension: 'TPM',
        limit: limitTokens,
        remaining: remainingTokens,
        resetAt: now + resetTokensMs,
        source,
        observedAt: now,
      });
    }

    // 3. Organization Daily TPD error signal
    if (error && (error.message?.toLowerCase().includes('daily') || error.message?.toLowerCase().includes('tokens per day'))) {
      signals.push({
        provider: 'groq',
        scope: 'ORGANIZATION',
        scopeId: 'org:groq',
        dimension: 'TPD',
        remaining: 0,
        source: 'PROVIDER_ERROR_SIGNAL',
        observedAt: now,
      });
    }

    return signals;
  }

  extractQuotaSignal(headers?: Headers | Record<string, string>, modelId?: string, error?: any): QuotaSignal {
    const rawHeaders: Record<string, string> = {};
    if (headers) {
      if (typeof (headers as any).entries === 'function') {
        for (const [k, v] of (headers as any).entries()) {
          rawHeaders[k.toLowerCase()] = v;
        }
      } else {
        for (const [k, v] of Object.entries(headers)) {
          rawHeaders[k.toLowerCase()] = String(v);
        }
      }
    }

    const now = Date.now();
    const source = error ? 'PROVIDER_ERROR_SIGNAL' : (Object.keys(rawHeaders).length > 0 ? 'LIVE_RESPONSE_HEADER' : 'STATIC_FALLBACK');

    const remainingTokens = rawHeaders['x-ratelimit-remaining-tokens'] ? parseInt(rawHeaders['x-ratelimit-remaining-tokens'], 10) : undefined;
    const limitTokens = rawHeaders['x-ratelimit-limit-tokens'] ? parseInt(rawHeaders['x-ratelimit-limit-tokens'], 10) : undefined;
    const resetTokensMs = parseResetTimeMs(rawHeaders['x-ratelimit-reset-tokens']);

    const remainingRequests = rawHeaders['x-ratelimit-remaining-requests'] ? parseInt(rawHeaders['x-ratelimit-remaining-requests'], 10) : undefined;
    const limitRequests = rawHeaders['x-ratelimit-limit-requests'] ? parseInt(rawHeaders['x-ratelimit-limit-requests'], 10) : undefined;
    const resetRequestsMs = parseResetTimeMs(rawHeaders['x-ratelimit-reset-requests']);

    const constraints: QuotaSignal['constraints'] = {};
    if (remainingTokens !== undefined || limitTokens !== undefined) {
      constraints.TPM = {
        limit: limitTokens,
        remaining: remainingTokens,
        resetAt: now + resetTokensMs,
      };
    }
    if (remainingRequests !== undefined || limitRequests !== undefined) {
      constraints.RPM = {
        limit: limitRequests,
        remaining: remainingRequests,
        resetAt: now + resetRequestsMs,
      };
    }

    const isDailyLimit = Boolean(error?.message && error.message.toLowerCase().includes('daily'));
    const isRateLimit = Boolean(error && (error.status === 429 || (error.status === 413 && error.message?.includes('tokens per minute'))));

    return {
      provider: 'groq',
      modelId,
      source,
      observedAt: now,
      constraints,
      rawHeaders,
      isRateLimit,
      isDailyLimit,
      isAuthError: error?.status === 401,
      isBillingError: error?.status === 402,
    };
  }

  async execute(
    modelId: string,
    messages: ChatMessage[],
    options?: ProviderExecutionOptions
  ): Promise<ProviderExecutionResult> {
    const apiKey = config.groq.apiKey;
    const baseUrl = config.groq.baseUrl || 'https://api.groq.com/openai/v1';
    const url = `${baseUrl}/chat/completions`;

    const body: Record<string, unknown> = {
      model: modelId,
      messages,
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 4096,
    };

    if (options?.responseFormatJson !== false) {
      body.response_format = { type: 'json_object' };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': 'TayDau-Force/1.0',
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options?.timeoutMs || 35_000),
    });

    const quotaHeaders: Record<string, string> = {};
    for (const [key, val] of res.headers.entries()) {
      if (key.includes('ratelimit') || key.includes('retry-after') || key.includes('quota')) {
        quotaHeaders[key.toLowerCase()] = val;
      }
    }

    const quotaSignal = this.extractQuotaSignal(quotaHeaders, modelId);
    const quotaSignals = this.extractNormalizedQuotaSignals(quotaHeaders, modelId);

    if (!res.ok) {
      const errText = await res.text();
      const parsedErr = this.parseError(
        { status: res.status, statusText: res.statusText, message: errText },
        quotaHeaders,
        modelId
      );
      const error: any = new Error(`Groq HTTP ${res.status}: ${errText}`);
      error.parsed = parsedErr;
      error.status = res.status;
      error.quotaHeaders = quotaHeaders;
      error.quotaSignal = parsedErr.quotaSignal;
      error.quotaSignals = parsedErr.quotaSignals;
      throw error;
    }

    const data = (await res.json()) as any;
    const content = data.choices?.[0]?.message?.content || '';
    const inputTokens = data.usage?.prompt_tokens || Math.round(JSON.stringify(messages).length / 4);
    const outputTokens = data.usage?.completion_tokens || Math.round(content.length / 4);

    return { content, inputTokens, outputTokens, quotaHeaders, quotaSignal, quotaSignals };
  }

  parseError(err: any, headers?: Headers | Record<string, string>, modelId?: string): ParsedProviderError {
    const status = err.status || (typeof err.message === 'string' && err.message.match(/HTTP\s+(\d+)/)?.[1]);
    const statusCode = status ? parseInt(String(status), 10) : 0;
    const message = err.message || 'Unknown Groq error';

    let retryAfterMs: number | undefined;
    if (headers) {
      const retryHeader = typeof (headers as any).get === 'function'
        ? (headers as any).get('retry-after')
        : (headers as Record<string, string>)['retry-after'];
      if (retryHeader) {
        const secs = parseFloat(retryHeader);
        if (!isNaN(secs)) retryAfterMs = Math.round(secs * 1000);
      }
    }

    const quotaSignal = this.extractQuotaSignal(headers, modelId, { status: statusCode, message });
    const quotaSignals = this.extractNormalizedQuotaSignals(headers, modelId, { status: statusCode, message });

    // Disambiguate Groq 413: Rate limit reached on TPM vs payload too large
    const isTpm413 = statusCode === 413 && message.toLowerCase().includes('tokens per minute');

    if (statusCode === 429 || isTpm413) {
      const isDaily = message.toLowerCase().includes('daily') || message.toLowerCase().includes('day');
      return {
        quotaState: isDaily ? 'DAILY_QUOTA_EXHAUSTED' : 'RATE_LIMITED',
        retryAfterMs: retryAfterMs || (isDaily ? 43_200_000 : 30_000),
        isAuthError: false,
        isBillingError: false,
        isRateLimit: true,
        isModelNotFound: false,
        isTransient: true,
        message: isDaily
          ? `Groq daily token limit exceeded (HTTP ${statusCode}). Cooldown applied.`
          : `Groq rate limit exceeded (HTTP ${statusCode}). Retry after ${retryAfterMs || 30000}ms.`,
        quotaSignal,
        quotaSignals,
      };
    }

    if (statusCode === 401) {
      return {
        quotaState: 'AUTH_FAILED',
        isAuthError: true,
        isBillingError: false,
        isRateLimit: false,
        isModelNotFound: false,
        isTransient: false,
        message: 'Groq authentication failed (HTTP 401). Invalid API key.',
        quotaSignal,
        quotaSignals,
      };
    }

    if (statusCode === 402 || message.toLowerCase().includes('billing')) {
      return {
        quotaState: 'BILLING_REQUIRED',
        isAuthError: false,
        isBillingError: true,
        isRateLimit: false,
        isModelNotFound: false,
        isTransient: false,
        message: 'Groq requires active billing payment (HTTP 402).',
        quotaSignal,
        quotaSignals,
      };
    }

    if (statusCode === 404 || message.toLowerCase().includes('model_not_found')) {
      return {
        quotaState: 'MODEL_UNAVAILABLE',
        isAuthError: false,
        isBillingError: false,
        isRateLimit: false,
        isModelNotFound: true,
        isTransient: false,
        message: 'Requested Groq model not found or deprecated.',
        quotaSignal,
        quotaSignals,
      };
    }

    if (statusCode >= 500) {
      return {
        quotaState: 'PROVIDER_UNAVAILABLE',
        isAuthError: false,
        isBillingError: false,
        isRateLimit: false,
        isModelNotFound: false,
        isTransient: true,
        message: `Groq service outage (HTTP ${statusCode}).`,
        quotaSignal,
        quotaSignals,
      };
    }

    return {
      quotaState: 'UNKNOWN',
      isAuthError: false,
      isBillingError: false,
      isRateLimit: false,
      isModelNotFound: false,
      isTransient: true,
      message,
      quotaSignal,
      quotaSignals,
    };
  }
}
