import { config } from '../config.js';
import type { ModelGateway } from './model-gateway.js';
import { GroqProvider } from './groq-provider.js';
import { QwenProvider } from './qwen-provider.js';

/**
 * Provider factory — returns the active ModelGateway based on MODEL_PROVIDER.
 * Agents must NEVER directly instantiate providers; always use this factory.
 */
export function createGateway(): ModelGateway {
  switch (config.modelProvider) {
    case 'groq':
      return new GroqProvider();
    case 'alibaba':
    case 'qwen':  // legacy alias — prefer 'alibaba'
      return new QwenProvider();
    default:
      throw new Error(
        `Unknown MODEL_PROVIDER: '${config.modelProvider}'. Must be one of: groq, alibaba`
      );
  }
}
