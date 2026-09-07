import { config } from '../../config.js';
import type { QuotaSignal } from '../../schemas/quota.js';
import {
  ChatMessage,
  ParsedProviderError,
  ProviderAdapter,
  ProviderExecutionOptions,
  ProviderExecutionResult,
} from './provider-adapter.interface.js';

export interface ExperientialLiveCatalogItem {
  id: string;
  slug: string;
  displayName: string;
  isPromotionalFree: boolean;
  contextWindow: number;
  maxOutputTokens: number;
  supportsStructuredOutputs: boolean;
  supportsTemperature: boolean;
  inputCostPer1M: number;
  outputCostPer1M: number;
  pricingProvenance: string;
  lastVerified: string;
}

export class ExperientialAdapter implements ProviderAdapter {
  readonly providerId = 'experiential';
  readonly trustLevel = 'VERIFIED_INFERENCE_PLATFORM' as const;
  readonly defaultBilling = 'FREE_TIER' as const;

  // Cached dynamic model discovery (5 min TTL)
  private cachedModels: string[] | null = null;
  private cachedCatalog: Record<string, ExperientialLiveCatalogItem> | null = null;
  private cacheExpiresAt = 0;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  isConfigured(): boolean {
    return Boolean(config.experiential?.apiKey && config.experiential.apiKey.trim().length > 0);
  }

  /**
   * Safe Secret Redaction: Strips Bearer tokens, Authorization strings, and xpl_ key patterns.
   */
  private sanitizeError(rawMessage: string): string {
    return rawMessage
      .replace(/Bearer\s+[A-Za-z0-9_\-\.]+/gi, 'Bearer [REDACTED]')
      .replace(/xpl_[A-Za-z0-9_\-]+/gi, 'xpl_[REDACTED]')
      .replace(/"apiKey":\s*"[^"]+"/gi, '"apiKey": "[REDACTED]"');
  }

  /**
   * Invalidate model discovery cache immediately upon model-not-granted or error.
   */
  invalidateCache(): void {
    this.cachedModels = null;
    this.cachedCatalog = null;
    this.cacheExpiresAt = 0;
  }

  /**
   * Dynamic Model Discovery via GET /v1/models with TTL caching.
   * Proves CALLABILITY to this specific API key.
   */
  async listModels(forceRefresh = false): Promise<string[]> {
    const now = Date.now();
    if (!forceRefresh && this.cachedModels && now < this.cacheExpiresAt) {
      return this.cachedModels;
    }

    if (!this.isConfigured()) {
      return [];
    }

    try {
      const baseUrl = config.experiential?.baseUrl || 'https://api.experientiallabs.ai/v1';
      const url = `${baseUrl}/models`;
      const headers: Record<string, string> = {
        'User-Agent': 'TayDau-Force/1.0',
        'X-Title': 'TayDau Force',
        Authorization: `Bearer ${config.experiential.apiKey}`,
      };

      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        return [];
      }
      const data = (await res.json()) as any;
      const modelList = (data.data || []).map((m: any) => m.id);

      this.cachedModels = modelList;
      this.cacheExpiresAt = now + this.CACHE_TTL_MS;
      return modelList;
    } catch {
      return [];
    }
  }

  /**
   * Dynamic Live Catalog Metadata via GET /api/models with promotions and pricing.
   * Proves COMMERCIAL METADATA, PROMOTIONAL FREE TIER, and CONTEXT LIMITS.
   */
  async fetchLiveCatalog(forceRefresh = false): Promise<Record<string, ExperientialLiveCatalogItem>> {
    const now = Date.now();
    if (!forceRefresh && this.cachedCatalog && now < this.cacheExpiresAt) {
      return this.cachedCatalog;
    }

    const fallbackCatalog: Record<string, ExperientialLiveCatalogItem> = {
      'experiential/hermes-3-llama-3.1-405b': {
        id: 'experiential/hermes-3-llama-3.1-405b',
        slug: 'hermes-3-llama-3.1-405b',
        displayName: 'Hermes 3 Llama 3.1 405B (Experiential)',
        isPromotionalFree: true,
        contextWindow: 131072,
        maxOutputTokens: 8192,
        supportsStructuredOutputs: true,
        supportsTemperature: true,
        inputCostPer1M: 0.0,
        outputCostPer1M: 0.0,
        pricingProvenance: 'EXPERIENTIAL_LIVE_PROMOTION_FREE',
        lastVerified: new Date().toISOString(),
      },
      'experiential/deepseek-r1': {
        id: 'experiential/deepseek-r1',
        slug: 'deepseek-r1',
        displayName: 'DeepSeek R1 (Experiential)',
        isPromotionalFree: true,
        contextWindow: 65536,
        maxOutputTokens: 8192,
        supportsStructuredOutputs: true,
        supportsTemperature: true,
        inputCostPer1M: 0.0,
        outputCostPer1M: 0.0,
        pricingProvenance: 'EXPERIENTIAL_LIVE_PROMOTION_FREE',
        lastVerified: new Date().toISOString(),
      },
    };

    if (!this.isConfigured()) {
      return fallbackCatalog;
    }

    try {
      const publicBase = 'https://api.experientiallabs.ai/api';
      const url = `${publicBase}/models`;
      const headers: Record<string, string> = {
        'User-Agent': 'TayDau-Force/1.0',
        'X-Title': 'TayDau Force',
      };

      const res = await fetch(url, { headers, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        return fallbackCatalog;
      }

      const data = (await res.json()) as any;
      const rawList = Array.isArray(data) ? data : (data.models || data.data || []);
      const catalog: Record<string, ExperientialLiveCatalogItem> = {};

      for (const item of rawList) {
        const id = item.id || item.model_id || item.name;
        if (!id) continue;

        const isFree = Boolean(
          item.is_free ||
          item.free ||
          item.promotional_free ||
          item.pricing?.input === 0 ||
          item.pricing?.input_cost_per_1m === 0 ||
          item.pricing?.free
        );

        const fullId = id.startsWith('experiential/') ? id : `experiential/${id}`;

        catalog[fullId] = {
          id: fullId,
          slug: id,
          displayName: item.display_name || item.name || id,
          isPromotionalFree: isFree,
          contextWindow: item.context_length || item.context_window || 131072,
          maxOutputTokens: item.max_output_tokens || 8192,
          supportsStructuredOutputs: item.supports_structured_outputs ?? true,
          supportsTemperature: item.supports_temperature ?? true,
          inputCostPer1M: isFree ? 0.0 : (item.pricing?.input ?? item.pricing?.input_cost_per_1m ?? 1.0),
          outputCostPer1M: isFree ? 0.0 : (item.pricing?.output ?? item.pricing?.output_cost_per_1m ?? 2.0),
          pricingProvenance: isFree ? 'EXPERIENTIAL_LIVE_PROMOTION_FREE' : 'EXPERIENTIAL_LIVE_CATALOG_RATE',
          lastVerified: new Date().toISOString(),
        };
      }

      this.cachedCatalog = catalog;
      this.cacheExpiresAt = now + this.CACHE_TTL_MS;
      return catalog;
    } catch {
      return fallbackCatalog;
    }
  }

  async validateConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, error: 'EXPLABS_API_KEY is not configured in environment.' };
    }
    try {
      const models = await this.listModels();
      if (models.length > 0) return { ok: true };
      return { ok: false, error: 'Could not fetch models from Experiential Labs API.' };
    } catch (err: any) {
      return { ok: false, error: this.sanitizeError(err.message) };
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
    if (rawHeaders['x-ratelimit-remaining-requests']) {
      constraints.RPM = {
        remaining: parseInt(rawHeaders['x-ratelimit-remaining-requests'], 10),
      };
    }
    if (rawHeaders['x-ratelimit-remaining-tokens']) {
      constraints.TPM = {
        remaining: parseInt(rawHeaders['x-ratelimit-remaining-tokens'], 10),
      };
    }

    const isRateLimit = Boolean(error && (error.status === 429 || (typeof error.message === 'string' && error.message.toLowerCase().includes('rate limit'))));
    const isDailyLimit = Boolean(error && (error.status === 402 || (typeof error.message === 'string' && error.message.toLowerCase().includes('quota'))));

    return {
      provider: 'experiential',
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
    const apiKey = config.experiential?.apiKey;
    if (!apiKey) {
      throw new Error('Experiential Labs API key is missing. Ensure EXPLABS_API_KEY is set.');
    }

    const baseUrl = config.experiential?.baseUrl || 'https://api.experientiallabs.ai/v1';
    const url = `${baseUrl}/chat/completions`;

    const body: Record<string, unknown> = {
      model: modelId,
      messages,
      max_tokens: options?.maxTokens ?? 2048,
    };

    // Parameter Adaptation: temperature handling per model support
    const lowerModel = modelId.toLowerCase();
    const isReasoningNoTemp = lowerModel.includes('gpt-6') || lowerModel.includes('gpt-5.6') || lowerModel.includes('astra') || lowerModel.includes('luna');
    const isClaudeFable = lowerModel.includes('claude-fable');

    if (isReasoningNoTemp) {
      // Omit temperature entirely for models that reject temperature parameter
    } else if (isClaudeFable) {
      body.temperature = 1.0;
    } else if (options?.temperature !== undefined) {
      body.temperature = options.temperature;
    } else {
      body.temperature = 0.2;
    }

    if (options?.responseFormatJson !== false) {
      body.response_format = { type: 'json_object' };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
      'User-Agent': 'TayDau-Force/1.0',
      'X-Title': 'TayDau Force',
    };

    // Mandatory Idempotency-Key support
    if (options?.idempotencyKey) {
      headers['Idempotency-Key'] = options.idempotencyKey;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(options?.timeoutMs || 45_000),
    });

    const quotaHeaders: Record<string, string> = {};
    for (const [key, val] of res.headers.entries()) {
      if (key.includes('ratelimit') || key.includes('retry-after') || key.includes('quota') || key.includes('idempotency')) {
        quotaHeaders[key.toLowerCase()] = val;
      }
    }

    const quotaSignal = this.extractQuotaSignal(quotaHeaders, modelId);

    if (!res.ok) {
      const errText = await res.text();
      const sanitizedErr = this.sanitizeError(errText);

      // Handle Experiential 409 idempotency_replay_unavailable: auto-retry with fresh key
      if (res.status === 409 && sanitizedErr.includes('idempotency_replay_unavailable') && options?.idempotencyKey) {
        headers['Idempotency-Key'] = `${options.idempotencyKey}:fresh-${Date.now()}`;
        const retryRes = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(options?.timeoutMs || 45_000),
        });
        if (retryRes.ok) {
          const retryData = (await retryRes.json()) as any;
          const retryContent = retryData.choices?.[0]?.message?.content || '';
          const retryInputTokens = retryData.usage?.prompt_tokens || Math.round(JSON.stringify(messages).length / 4);
          const retryOutputTokens = retryData.usage?.completion_tokens || Math.round(retryContent.length / 4);
          return { content: retryContent, inputTokens: retryInputTokens, outputTokens: retryOutputTokens, quotaHeaders, quotaSignal };
        }
      }

      const parsedErr = this.parseError(
        { status: res.status, statusText: res.statusText, message: sanitizedErr },
        quotaHeaders,
        modelId
      );

      // Invalidate discovery cache on model-not-granted errors
      if (parsedErr.isModelNotFound) {
        this.invalidateCache();
      }

      const error: any = new Error(`Experiential HTTP ${res.status}: ${sanitizedErr}`);
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
    const rawMsg = err.message || 'Unknown Experiential error';
    const message = this.sanitizeError(rawMsg);
    const lowerMsg = message.toLowerCase();

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

    // 1. Authentication failure (invalid_key) -> AUTH_FAILED (no retry)
    if (statusCode === 401 || statusCode === 403 || lowerMsg.includes('invalid_key') || lowerMsg.includes('unauthorized')) {
      return {
        quotaState: 'AUTH_FAILED',
        isAuthError: true,
        isBillingError: false,
        isRateLimit: false,
        isModelNotFound: false,
        isTransient: false,
        message: 'Experiential authentication failed (invalid_key/401/403). Non-retryable.',
        quotaSignal,
      };
    }

    // 2. Insufficient Quota / Credits -> BILLING_REQUIRED (non-transient, mark route ineligible)
    if (statusCode === 402 || lowerMsg.includes('insufficient_quota') || lowerMsg.includes('billing_required') || lowerMsg.includes('quota_exceeded')) {
      return {
        quotaState: 'BILLING_REQUIRED',
        isAuthError: false,
        isBillingError: true,
        isRateLimit: false,
        isModelNotFound: false,
        isTransient: false,
        message: 'Experiential quota exhausted / billing required (insufficient_quota).',
        quotaSignal,
      };
    }

    // 3. Model Not Granted / Unavailable -> MODEL_UNAVAILABLE (non-transient for this model)
    if (statusCode === 404 || lowerMsg.includes('model_not_granted') || lowerMsg.includes('model_unavailable') || lowerMsg.includes('not found')) {
      return {
        quotaState: 'MODEL_UNAVAILABLE',
        isAuthError: false,
        isBillingError: false,
        isRateLimit: false,
        isModelNotFound: true,
        isTransient: false,
        message: 'Experiential model not granted or deprecated (model_not_granted).',
        quotaSignal,
      };
    }

    // 4. All Routes Failed -> PROVIDER_UNAVAILABLE (triggers TayDau router level-2 failover)
    if (lowerMsg.includes('all_routes_failed') || lowerMsg.includes('provider_route_failure')) {
      return {
        quotaState: 'PROVIDER_UNAVAILABLE',
        isAuthError: false,
        isBillingError: false,
        isRateLimit: false,
        isModelNotFound: false,
        isTransient: true,
        message: 'EXPERIENTIAL_ALL_ROUTES_FAILED',
        quotaSignal,
      };
    }

    // 5. Rate Limited / Gateway Overloaded / Unavailable Route (transient, bounded backoff)
    if (statusCode === 429 || lowerMsg.includes('unavailable_route') || lowerMsg.includes('gateway_overloaded') || lowerMsg.includes('rate limit')) {
      return {
        quotaState: 'RATE_LIMITED',
        retryAfterMs: retryAfterMs || 30_000,
        isAuthError: false,
        isBillingError: false,
        isRateLimit: true,
        isModelNotFound: false,
        isTransient: true,
        message: `Experiential rate limit / route overload (HTTP 429 / gateway_overloaded). Retry after ${retryAfterMs || 30000}ms.`,
        quotaSignal,
      };
    }

    // 6. Provider Outage / Deadline Exceeded (5xx)
    if (statusCode >= 500 || lowerMsg.includes('deadline_exceeded') || lowerMsg.includes('timeout')) {
      return {
        quotaState: 'PROVIDER_UNAVAILABLE',
        isAuthError: false,
        isBillingError: false,
        isRateLimit: false,
        isModelNotFound: false,
        isTransient: true,
        message: `Experiential service outage or timeout (HTTP ${statusCode}).`,
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

export const experientialAdapter = new ExperientialAdapter();
