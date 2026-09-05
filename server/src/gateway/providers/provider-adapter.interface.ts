import { ProviderTrust, QuotaState, BillingClassification } from '../../schemas/routing.js';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ProviderExecutionOptions {
  temperature?: number;
  maxTokens?: number;
  responseFormatJson?: boolean;
}

export interface ProviderExecutionResult {
  content: string;
  inputTokens: number;
  outputTokens: number;
  quotaHeaders?: Record<string, string>;
}

export interface ParsedProviderError {
  quotaState: QuotaState;
  retryAfterMs?: number;
  isAuthError: boolean;
  isBillingError: boolean;
  isRateLimit: boolean;
  isModelNotFound: boolean;
  isTransient: boolean;
  message: string;
}

export interface ProviderAdapter {
  readonly providerId: string;
  readonly trustLevel: ProviderTrust;
  readonly defaultBilling: BillingClassification;

  isConfigured(): boolean;
  listModels(): Promise<string[]>;
  validateConnection(): Promise<{ ok: boolean; error?: string }>;
  execute(
    modelId: string,
    messages: ChatMessage[],
    options?: ProviderExecutionOptions
  ): Promise<ProviderExecutionResult>;
  parseError(err: any, headers?: Headers | Record<string, string>): ParsedProviderError;
}
