import type { ModelGateway } from './model-gateway.js';
import { RoutedModelGateway } from './routed-gateway.js';

/**
 * Provider factory — returns the active evidence-governed RoutedModelGateway.
 * Dynamically evaluates task profile, capability floor, provider health,
 * cost optimization, and bounded fallbacks.
 */
export function createGateway(): ModelGateway {
  return new RoutedModelGateway();
}
