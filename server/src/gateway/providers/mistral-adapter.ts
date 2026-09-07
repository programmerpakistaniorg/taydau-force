import { config } from '../../config.js';
import type { QuotaSignal } from '../../schemas/quota.js';
import {
  ChatMessage,
  ParsedProviderError,
  ProviderAdapter,
  ProviderExecutionOptions,
  ProviderExecutionResult,
} from './provider-adapter.interface.js';

export class MistralAdapter implements ProviderAdapter {
  readonly providerId = 'mistral';
  readonly trustLevel = 'FIRST_PARTY' as const;
  readonly defaultBilling = 'FREE_TIER' as const;

  isConfigured(): boolean {
    return Boolean(config.mistral.apiKey && config.mistral.apiKey.trim().length > 0);
  }

  async listModels(): Promise<string[]> {
    if (!this.isConfigured()) return [];
    try {
      const url = `${config.mistral.baseUrl}/models`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${config.mistral.apiKey}`,
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
      return { ok: false, error: 'MISTRAL_API_KEY is not configured in environment.' };
    }
    try {
      const models = await this.listModels();
      if (models.length > 0) return { ok: true };
      return { ok: false, error: 'Could not fetch models from Mistral API.' };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
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

    const constraints: QuotaSignal['constraints'] = {};
    if (rawHeaders['ratelimit-remaining-req']) {
      constraints.RPM = {
        remaining: parseInt(rawHeaders['ratelimit-remaining-req'], 10),
      };
    }

    const isRateLimit = Boolean(error && error.status === 429);
    const isDailyLimit = Boolean(error && (error.status === 402 || (typeof error.message === 'string' && error.message.toLowerCase().includes('quota'))));

    return {
      provider: 'mistral',
      modelId,
      source,
      observedAt: now,
      constraints,
      rawHeaders,
      isRateLimit,
      isDailyLimit,
      isAuthError: error?.status === 401 || error?.status === 403,
      isBillingError: error?.status === 402,
    };
  }

  async execute(
    modelId: string,
    messages: ChatMessage[],
    options?: ProviderExecutionOptions
  ): Promise<ProviderExecutionResult> {
    const apiKey = config.mistral.apiKey;
    const baseUrl = config.mistral.baseUrl || 'https://api.mistral.ai/v1';
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
      signal: AbortSignal.timeout(options?.timeoutMs || 60_000),
    });

    const quotaHeaders: Record<string, string> = {};
    for (const [key, val] of res.headers.entries()) {
      if (key.includes('ratelimit') || key.includes('retry-after') || key.includes('quota')) {
        quotaHeaders[key.toLowerCase()] = val;
      }
    }

    const quotaSignal = this.extractQuotaSignal(quotaHeaders, modelId);

    if (!res.ok) {
      const errText = await res.text();
      const parsedErr = this.parseError(
        { status: res.status, statusText: res.statusText, message: errText },
        quotaHeaders,
        modelId
      );
      const error: any = new Error(`Mistral HTTP ${res.status}: ${errText}`);
      error.parsed = parsedErr;
      error.status = res.status;
      error.quotaHeaders = quotaHeaders;
      error.quotaSignal = parsedErr.quotaSignal;
      throw error;
    }

    const data = (await res.json()) as any;
    const content = data.choices?.[0]?.message?.content || '';
    const inputTokens = data.usage?.prompt_tokens || Math.round(JSON.stringify(messages).length / 4);
    const outputTokens = data.usage?.completion_tokens || Math.round(content.length / 4);

    return { content, inputTokens, outputTokens, quotaHeaders, quotaSignal };
  }

  parseError(err: any, headers?: Headers | Record<string, string>, modelId?: string): ParsedProviderError {
    const status = err.status || (typeof err.message === 'string' && err.message.match(/HTTP\s+(\d+)/)?.[1]);
    const statusCode = status ? parseInt(String(status), 10) : 0;
    const message = err.message || 'Unknown Mistral error';

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

    if (statusCode === 429) {
      return {
        quotaState: 'RATE_LIMITED',
        retryAfterMs: retryAfterMs || 30_000,
        isAuthError: false,
        isBillingError: false,
        isRateLimit: true,
        isModelNotFound: false,
        isTransient: true,
        message: `Mistral rate limit exceeded (HTTP 429). Retry after ${retryAfterMs || 30000}ms.`,
        quotaSignal,
      };
    }

    if (statusCode === 401 || statusCode === 403) {
      return {
        quotaState: 'AUTH_FAILED',
        isAuthError: true,
        isBillingError: false,
        isRateLimit: false,
        isModelNotFound: false,
        isTransient: false,
        message: 'Mistral authentication failed (HTTP 401/403). Invalid API key.',
        quotaSignal,
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
        message: 'Mistral requires active billing payment (HTTP 402).',
        quotaSignal,
      };
    }

    if (statusCode === 404) {
      return {
        quotaState: 'MODEL_UNAVAILABLE',
        isAuthError: false,
        isBillingError: false,
        isRateLimit: false,
        isModelNotFound: true,
        isTransient: false,
        message: 'Requested Mistral model not found or deprecated.',
        quotaSignal,
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
        message: `Mistral service outage (HTTP ${statusCode}).`,
        quotaSignal,
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
    };
  }
}
