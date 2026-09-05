import { config } from '../../config.js';
import {
  ChatMessage,
  ParsedProviderError,
  ProviderAdapter,
  ProviderExecutionOptions,
  ProviderExecutionResult,
} from './provider-adapter.interface.js';

export class OpenRouterAdapter implements ProviderAdapter {
  readonly providerId = 'openrouter';
  readonly trustLevel = 'VERIFIED_INFERENCE_PLATFORM' as const;
  readonly defaultBilling = 'FREE_TIER' as const;

  isConfigured(): boolean {
    return Boolean(config.openrouter.apiKey && config.openrouter.apiKey.trim().length > 0);
  }

  async listModels(): Promise<string[]> {
    try {
      const url = `${config.openrouter.baseUrl}/models`;
      const headers: Record<string, string> = {
        'User-Agent': 'TayDau-Force/1.0',
        'HTTP-Referer': 'https://taydau.force',
        'X-Title': 'TayDau Force',
      };
      if (this.isConfigured()) {
        headers['Authorization'] = `Bearer ${config.openrouter.apiKey}`;
      }
      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) return [];
      const data = (await res.json()) as any;
      return (data.data || []).map((m: any) => m.id);
    } catch {
      return [];
    }
  }

  async validateConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, error: 'OPENROUTER_API_KEY is not configured in environment.' };
    }
    try {
      const models = await this.listModels();
      if (models.length > 0) return { ok: true };
      return { ok: false, error: 'Could not fetch models from OpenRouter API.' };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async execute(
    modelId: string,
    messages: ChatMessage[],
    options?: ProviderExecutionOptions
  ): Promise<ProviderExecutionResult> {
    const apiKey = config.openrouter.apiKey;
    const baseUrl = config.openrouter.baseUrl || 'https://openrouter.ai/api/v1';
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
      'HTTP-Referer': 'https://taydau.force',
      'X-Title': 'TayDau Force',
    };

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(60_000),
    });

    const quotaHeaders: Record<string, string> = {};
    for (const [key, val] of res.headers.entries()) {
      if (key.includes('ratelimit') || key.includes('retry-after') || key.includes('quota')) {
        quotaHeaders[key] = val;
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      const parsedErr = this.parseError(
        { status: res.status, statusText: res.statusText, message: errText },
        quotaHeaders
      );
      const error: any = new Error(`OpenRouter HTTP ${res.status}: ${errText}`);
      error.parsed = parsedErr;
      error.status = res.status;
      error.quotaHeaders = quotaHeaders;
      throw error;
    }

    const data = (await res.json()) as any;
    const content = data.choices?.[0]?.message?.content || '';
    const inputTokens = data.usage?.prompt_tokens || Math.round(JSON.stringify(messages).length / 4);
    const outputTokens = data.usage?.completion_tokens || Math.round(content.length / 4);

    return { content, inputTokens, outputTokens, quotaHeaders };
  }

  parseError(err: any, headers?: Headers | Record<string, string>): ParsedProviderError {
    const status = err.status || (typeof err.message === 'string' && err.message.match(/HTTP\s+(\d+)/)?.[1]);
    const statusCode = status ? parseInt(String(status), 10) : 0;
    const message = err.message || 'Unknown OpenRouter error';

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

    if (statusCode === 429) {
      return {
        quotaState: 'RATE_LIMITED',
        retryAfterMs: retryAfterMs || 30_000,
        isAuthError: false,
        isBillingError: false,
        isRateLimit: true,
        isModelNotFound: false,
        isTransient: true,
        message: `OpenRouter rate limit exceeded (HTTP 429). Retry after ${retryAfterMs || 30000}ms.`,
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
        message: 'OpenRouter authentication failed (HTTP 401/403). Invalid API key.',
      };
    }

    if (statusCode === 402 || message.toLowerCase().includes('credits') || message.toLowerCase().includes('balance')) {
      return {
        quotaState: 'BILLING_REQUIRED',
        isAuthError: false,
        isBillingError: true,
        isRateLimit: false,
        isModelNotFound: false,
        isTransient: false,
        message: 'OpenRouter requires active credits for this model (HTTP 402).',
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
        message: 'Requested OpenRouter model not found or deprecated.',
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
        message: `OpenRouter service outage (HTTP ${statusCode}).`,
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
    };
  }
}
