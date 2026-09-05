import { config } from '../../config.js';
import {
  ChatMessage,
  ParsedProviderError,
  ProviderAdapter,
  ProviderExecutionOptions,
  ProviderExecutionResult,
} from './provider-adapter.interface.js';

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
      const error: any = new Error(`Groq HTTP ${res.status}: ${errText}`);
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

    if (statusCode === 429) {
      return {
        quotaState: 'RATE_LIMITED',
        retryAfterMs: retryAfterMs || 30_000,
        isAuthError: false,
        isBillingError: false,
        isRateLimit: true,
        isModelNotFound: false,
        isTransient: true,
        message: `Groq rate limit exceeded (HTTP 429). Retry after ${retryAfterMs || 30000}ms.`,
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
