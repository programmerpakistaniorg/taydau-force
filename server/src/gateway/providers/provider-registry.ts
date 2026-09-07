import { ProviderAdapter } from './provider-adapter.interface.js';
import { GroqAdapter } from './groq-adapter.js';
import { GeminiAdapter } from './gemini-adapter.js';
import { NvidiaAdapter } from './nvidia-adapter.js';
import { MistralAdapter } from './mistral-adapter.js';
import { OpenRouterAdapter } from './openrouter-adapter.js';
import { ExperientialAdapter } from './experiential-adapter.js';
import { LocalLlamaCppAdapter } from './local-llamacpp-adapter.js';

class ProviderAdapterRegistry {
  private adapters: Map<string, ProviderAdapter> = new Map();

  constructor() {
    this.register(new GroqAdapter());
    this.register(new GeminiAdapter());
    this.register(new NvidiaAdapter());
    this.register(new MistralAdapter());
    this.register(new OpenRouterAdapter());
    this.register(new ExperientialAdapter());
    this.register(new LocalLlamaCppAdapter());
  }

  register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.providerId, adapter);
  }

  get(providerId: string): ProviderAdapter | undefined {
    return this.adapters.get(providerId);
  }

  getAll(): ProviderAdapter[] {
    return Array.from(this.adapters.values());
  }

  getConfigured(): ProviderAdapter[] {
    return this.getAll().filter(a => a.isConfigured());
  }

  async validateAll(): Promise<Record<string, { ok: boolean; error?: string }>> {
    const results: Record<string, { ok: boolean; error?: string }> = {};
    for (const adapter of this.getAll()) {
      results[adapter.providerId] = await adapter.validateConnection();
    }
    return results;
  }

  async getProviderPreflightReport() {
    const report: Array<{
      providerId: string;
      trustLevel: string;
      configured: boolean;
      connection: 'VERIFIED' | 'AUTH_FAILED' | 'NOT_CONFIGURED' | 'UNAVAILABLE';
      error?: string;
      callableModelsCount: number;
      models: string[];
    }> = [];

    for (const adapter of this.getAll()) {
      const configured = adapter.isConfigured();
      if (!configured) {
        report.push({
          providerId: adapter.providerId,
          trustLevel: adapter.trustLevel,
          configured: false,
          connection: 'NOT_CONFIGURED',
          callableModelsCount: 0,
          models: [],
        });
        continue;
      }

      try {
        const val = await adapter.validateConnection();
        const models = await adapter.listModels();
        report.push({
          providerId: adapter.providerId,
          trustLevel: adapter.trustLevel,
          configured: true,
          connection: val.ok ? 'VERIFIED' : val.error?.includes('auth') || val.error?.includes('401') || val.error?.includes('403') ? 'AUTH_FAILED' : 'UNAVAILABLE',
          error: val.error,
          callableModelsCount: models.length,
          models,
        });
      } catch (err: any) {
        report.push({
          providerId: adapter.providerId,
          trustLevel: adapter.trustLevel,
          configured: true,
          connection: 'UNAVAILABLE',
          error: err.message,
          callableModelsCount: 0,
          models: [],
        });
      }
    }
    return report;
  }
}

export const providerAdapters = new ProviderAdapterRegistry();

