import { config } from '../config.js';
import type { ModelGateway } from './model-gateway.js';
import { TabiProvider } from './tabi-provider.js';
import { GroqProvider } from './groq-provider.js';

/**
 * Provider factory — returns the active ModelGateway based on MODEL_PROVIDER.
 * Default is Tabi AI (with automatic Groq secondary failover).
 */
export function createGateway(): ModelGateway {
  switch (config.modelProvider) {
    case 'tabi':
    case 'tabitoken':
      return new TabiProvider();
    case 'groq':
      return new GroqProvider();
    default:
      return new TabiProvider();
  }
}
