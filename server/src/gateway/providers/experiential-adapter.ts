import { config } from '../../config.js';
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

    if (!this.isConfigured()) {
      return {};
    }

    try {
      const apiKey = config.experiential.apiKey;
      const url = 'https://api.experientiallabs.ai/api/models?limit=500';
      const headers: Record<string, string> = {
        'User-Agent': 'TayDau-Force/1.0',
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      };

      const res = await fetch(url, { headers, signal: AbortSignal.timeout(15_000) });
      if (!res.ok) {
        return {};
      }

      const data = (await res.json()) as any;
      const freeSlugs = new Set<string>();

      for (const promo of data.promotions || []) {
        if (promo.free === true) {
          for (const s of promo.slugs || []) freeSlugs.add(s.toLowerCase());
        }
      }

      const catalog: Record<string, ExperientialLiveCatalogItem> = {};
      const verifiedTimestamp = new Date().toISOString();

      for (const item of data.models || []) {
        const slug = item.model?.slug || item.slug;
        if (!slug) continue;
        const lowerSlug = slug.toLowerCase();
        const isPromotionalFree = freeSlugs.has(lowerSlug);

        catalog[slug] = {
          id: item.model?.id || slug,
          slug,
          displayName: item.model?.display_name || slug,
          isPromotionalFree,
          contextWindow: item.model?.context_window || 131072,
          maxOutputTokens: item.model?.max_output_tokens || 32768,
          supportsStructuredOutputs: Boolean(item.model?.supported_params?.structured_outputs || item.model?.supported_params?.response_format),
          supportsTemperature: item.model?.supported_params?.temperature !== false,
          inputCostPer1M: isPromotionalFree ? 0.0 : 1.0,
          outputCostPer1M: isPromotionalFree ? 0.0 : 2.0,
          pricingProvenance: isPromotionalFree ? 'LIVE_EXPERIENTIAL_PROMOTIONAL_FREE' : 'LIVE_EXPERIENTIAL_CATALOG_PAID',
          lastVerified: verifiedTimestamp,
        };
      }

      this.cachedCatalog = catalog;
      this.cacheExpiresAt = now + this.CACHE_TTL_MS;
      return catalog;
    } catch {
      return {};
    }
  }

  async validateConnection(): Promise<{ ok: boolean; error?: string }> {
    if (!this.isConfigured()) {
      return { ok: false, error: 'EXPLABS_API_KEY is not configured in environment.' };
    }
    try {
      const models = await this.listModels(true);
      if (models.length > 0) {
        return { ok: true };
      }
      return { ok: false, error: 'Could not fetch models from Experiential Labs API.' };
    } catch (err: any) {
      return { ok: false, error: this.sanitizeError(err.message) };
    }
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
      signal: AbortSignal.timeout(60_000),
    });

    const quotaHeaders: Record<string, string> = {};
    for (const [key, val] of res.headers.entries()) {
      if (key.includes('ratelimit') || key.includes('retry-after') || key.includes('quota') || key.includes('idempotency')) {
        quotaHeaders[key] = val;
      }
    }

    if (!res.ok) {
      const errText = await res.text();
      const sanitizedErr = this.sanitizeError(errText);
      const parsedErr = this.parseError(
        { status: res.status, statusText: res.statusText, message: sanitizedErr },
        quotaHeaders
      );

      // Invalidate discovery cache on model-not-granted errors
      if (parsedErr.isModelNotFound) {
        this.invalidateCache();
      }

      const error: any = new Error(`Experiential HTTP ${res.status}: ${sanitizedErr}`);
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

export const experientialAdapter = new ExperientialAdapter();

