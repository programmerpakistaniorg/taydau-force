import { config } from '../../config.js';
import {
  ChatMessage,
  ParsedProviderError,
  ProviderAdapter,
  ProviderExecutionOptions,
  ProviderExecutionResult,
} from './provider-adapter.interface.js';

export class GeminiAdapter implements ProviderAdapter {
  readonly providerId = 'gemini';
  readonly trustLevel = 'FIRST_PARTY' as const;
  readonly defaultBilling = 'FREE_TIER' as const;

  isConfigured(): boolean {
    return Boolean(config.gemini.apiKey && config.gemini.apiKey.trim().length > 0);
  }

  async listModels(): Promise<string[]> {
    if (!this.isConfigured()) return [];
    try {
      const url = `${config.gemini.baseUrl}/models`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${config.gemini.apiKey}`,
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
      return { ok: false, error: 'GEMINI_API_KEY is not configured in environment.' };
    }
    try {
      const models = await this.listModels();
      if (models.length > 0) return { ok: true };
      return { ok: false, error: 'Could not fetch models from Google AI Studio API.' };
    } catch (err: any) {
      return { ok: false, error: err.message };
    }
  }

  async execute(
    modelId: string,
    messages: ChatMessage[],
    options?: ProviderExecutionOptions
  ): Promise<ProviderExecutionResult> {
    const apiKey = config.gemini.apiKey;
    const baseUrl = config.gemini.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/openai';
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
      const error: any = new Error(`Gemini HTTP ${res.status}: ${errText}`);
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
    const message = err.message || 'Unknown Gemini error';

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
        retryAfterMs: retryAfterMs || 60_000,
        isAuthError: false,
        isBillingError: false,
        isRateLimit: true,
        isModelNotFound: false,
        isTransient: true,
        message: `Google Gemini rate limit exceeded (HTTP 429). Retry after ${retryAfterMs || 60000}ms.`,
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
        message: 'Google Gemini authentication failed (HTTP 401/403). Invalid API key or permission denied.',
      };
    }

    if (statusCode === 402 || message.toLowerCase().includes('quota') || message.toLowerCase().includes('billing')) {
      return {
        quotaState: 'DAILY_QUOTA_EXHAUSTED',
        isAuthError: false,
        isBillingError: true,
        isRateLimit: false,
        isModelNotFound: false,
        isTransient: false,
        message: 'Google Gemini daily free quota exhausted (HTTP 402/Quota).',
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
        message: 'Requested Gemini model not found or deprecated.',
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
        message: `Google Gemini service outage (HTTP ${statusCode}).`,
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
