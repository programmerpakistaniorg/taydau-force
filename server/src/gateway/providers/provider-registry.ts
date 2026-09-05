import { ProviderAdapter } from './provider-adapter.interface.js';
import { GroqAdapter } from './groq-adapter.js';
import { GeminiAdapter } from './gemini-adapter.js';
import { NvidiaAdapter } from './nvidia-adapter.js';
import { MistralAdapter } from './mistral-adapter.js';
import { OpenRouterAdapter } from './openrouter-adapter.js';

class ProviderAdapterRegistry {
  private adapters: Map<string, ProviderAdapter> = new Map();

  constructor() {
    this.register(new GroqAdapter());
    this.register(new GeminiAdapter());
    this.register(new NvidiaAdapter());
    this.register(new MistralAdapter());
    this.register(new OpenRouterAdapter());
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
}

export const providerAdapters = new ProviderAdapterRegistry();
