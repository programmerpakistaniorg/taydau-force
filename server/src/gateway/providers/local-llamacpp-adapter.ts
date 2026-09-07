import fs from 'fs';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { config } from '../../config.js';
import type {
  ProviderAdapter,
  ChatMessage,
  ProviderExecutionOptions,
  ProviderExecutionResult,
  ParsedProviderError,
} from './provider-adapter.interface.js';
import type { ProviderTrust, BillingClassification, QuotaState } from '../../schemas/routing.js';

export interface LocalModelProcessState {
  process: ChildProcess | null;
  modelKey: 'qwen' | 'glm';
  port: number;
  baseUrl: string;
  ggufPath: string;
  mmprojPath?: string;
  isReady: boolean;
  pid?: number;
}

export class LocalLlamaCppAdapter implements ProviderAdapter {
  readonly providerId = 'local_llamacpp';
  readonly trustLevel: ProviderTrust = 'LOCAL_TRUSTED';
  readonly defaultBilling: BillingClassification = 'LOCAL';

  private processes: Map<string, LocalModelProcessState> = new Map();

  constructor() {
    // Initialize state containers for configured models
    const qwenConf = config.localLlamacpp.qwen;
    const glmConf = config.localLlamacpp.glm;

    this.processes.set('qwen', {
      process: null,
      modelKey: 'qwen',
      port: qwenConf.port,
      baseUrl: qwenConf.baseUrl,
      ggufPath: qwenConf.ggufPath,
      mmprojPath: qwenConf.mmprojPath,
      isReady: false,
    });

    this.processes.set('glm', {
      process: null,
      modelKey: 'glm',
      port: glmConf.port,
      baseUrl: glmConf.baseUrl,
      ggufPath: glmConf.ggufPath,
      mmprojPath: glmConf.mmprojPath,
      isReady: false,
    });
  }

  isConfigured(): boolean {
    if (!config.localLlamacpp.enabled) return false;
    // Considered configured if llama-server binary exists or if model GGUF exists
    const serverPath = config.localLlamacpp.llamaServerPath;
    const qwenGguf = config.localLlamacpp.qwen.ggufPath;
    const hasBinary = Boolean(serverPath && fs.existsSync(serverPath));
    const hasGguf = Boolean(qwenGguf && fs.existsSync(qwenGguf));
    return hasBinary || hasGguf;
  }

  async listModels(): Promise<string[]> {
    return [
      'local/qwen3.5-9b',
      'qwen3.5-9b',
      'local/glm-4.1v-9b-thinking',
      'glm-4.1v-9b-thinking',
    ];
  }

  private resolveModelEndpoint(modelId: string): { baseUrl: string; modelKey: 'qwen' | 'glm'; canonicalId: string } {
    const lower = modelId.toLowerCase();
    if (lower.includes('glm')) {
      return {
        baseUrl: config.localLlamacpp.glm.baseUrl,
        modelKey: 'glm',
        canonicalId: 'local/glm-4.1v-9b-thinking',
      };
    }
    return {
      baseUrl: config.localLlamacpp.qwen.baseUrl,
      modelKey: 'qwen',
      canonicalId: 'local/qwen3.5-9b',
    };
  }

  async validateConnection(modelId?: string): Promise<{ ok: boolean; error?: string; latencyMs?: number }> {
    const { baseUrl, modelKey } = this.resolveModelEndpoint(modelId || 'qwen3.5-9b');
    const startTime = Date.now();

    try {
      // Loopback security assertion: strictly only 127.0.0.1 or localhost allowed
      const urlObj = new URL(baseUrl);
      if (urlObj.hostname !== '127.0.0.1' && urlObj.hostname !== 'localhost') {
        return { ok: false, error: 'Local inference endpoint must bind strictly to loopback (127.0.0.1).' };
      }

      const res = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(3000),
      }).catch(async () => {
        // Fallback to /v1/models check if /health not implemented
        return fetch(`${baseUrl}/v1/models`, {
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(3000),
        });
      });

      const latencyMs = Date.now() - startTime;

      if (res.ok) {
        const proc = this.processes.get(modelKey);
        if (proc) proc.isReady = true;
        return { ok: true, latencyMs };
      }

      return {
        ok: false,
        error: `Local server HTTP ${res.status}: ${res.statusText}`,
      };
    } catch (err: any) {
      const sanitized = this.sanitizeError(err?.message || 'Server connection refused');
      return { ok: false, error: sanitized };
    }
  }

  async execute(
    modelId: string,
    messages: ChatMessage[],
    options?: ProviderExecutionOptions
  ): Promise<ProviderExecutionResult> {
    const { baseUrl, canonicalId } = this.resolveModelEndpoint(modelId);

    // Strict Loopback Security Check
    const urlObj = new URL(baseUrl);
    if (urlObj.hostname !== '127.0.0.1' && urlObj.hostname !== 'localhost') {
      throw new Error('SECURITY_VIOLATION: Local inference must communicate strictly with 127.0.0.1');
    }

    const payload: Record<string, unknown> = {
      model: canonicalId,
      messages,
      temperature: options?.temperature ?? 0.2,
      max_tokens: options?.maxTokens ?? 2048,
    };

    if (options?.responseFormatJson !== false) {
      payload.response_format = { type: 'json_object' };
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };

    let res: Response;
    const timeoutMs = options?.timeoutMs ?? 180000;
    try {
      res = await fetch(`${baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (err: any) {
      throw new Error(`LOCAL_LLAMACPP_OFFLINE: ${this.sanitizeError(err.message)}`);
    }

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`LOCAL_LLAMACPP_HTTP_${res.status}: ${this.sanitizeError(errText)}`);
    }

    const data = await res.json() as any;
    const msgObj = data.choices?.[0]?.message;
    let content = msgObj?.content ?? data.choices?.[0]?.text ?? '';
    
    // If content is empty but reasoning_content exists (e.g. thinking model hit token ceiling during thought)
    if (!content && msgObj?.reasoning_content) {
      content = msgObj.reasoning_content;
    }

    // If output contains <think>...</think> tags, extract final response after </think>
    if (content.includes('</think>')) {
      const parts = content.split('</think>');
      const afterThink = parts[parts.length - 1].trim();
      if (afterThink) {
        content = afterThink;
      }
    }

    const inputTokens = data.usage?.prompt_tokens ?? 0;
    const outputTokens = data.usage?.completion_tokens ?? 0;

    return {
      content,
      inputTokens,
      outputTokens,
    };
  }

  parseError(err: any, _headers?: Headers | Record<string, string>): ParsedProviderError {
    const rawMsg = err?.message || String(err);
    const sanitizedMsg = this.sanitizeError(rawMsg);
    const lower = sanitizedMsg.toLowerCase();

    let quotaState: QuotaState = 'UNKNOWN';
    let isAuthError = false;
    let isBillingError = false;
    let isRateLimit = false;
    let isModelNotFound = false;
    let isTransient = false;

    if (lower.includes('offline') || lower.includes('econnrefused') || lower.includes('fetch failed')) {
      quotaState = 'PROVIDER_UNAVAILABLE';
      isTransient = true;
    } else if (lower.includes('out of memory') || lower.includes('oom') || lower.includes('resource exhausted')) {
      quotaState = 'PROVIDER_UNAVAILABLE';
      isTransient = false;
    } else if (lower.includes('model not found') || lower.includes('not loaded') || lower.includes('404')) {
      quotaState = 'MODEL_UNAVAILABLE';
      isModelNotFound = true;
    } else {
      quotaState = 'PROVIDER_UNAVAILABLE';
      isTransient = true;
    }

    return {
      quotaState,
      isAuthError,
      isBillingError,
      isRateLimit,
      isModelNotFound,
      isTransient,
      message: sanitizedMsg,
    };
  }

  /**
   * Spawns a local llama-server process using safe argument array.
   * Strictly binds to 127.0.0.1. Never executes shell concatenation.
   */
  async startServer(
    modelKey: 'qwen' | 'glm' = 'qwen',
    options?: { contextTokens?: number; threads?: number }
  ): Promise<{ ok: boolean; pid?: number; error?: string }> {
    const procState = this.processes.get(modelKey);
    if (!procState) {
      return { ok: false, error: `Unknown model key '${modelKey}'` };
    }

    const llamaServerBin = config.localLlamacpp.llamaServerPath;
    if (!fs.existsSync(llamaServerBin)) {
      return { ok: false, error: `llama-server binary not found at ${this.sanitizeError(llamaServerBin)}` };
    }

    if (!fs.existsSync(procState.ggufPath)) {
      return { ok: false, error: `GGUF model file not found at ${this.sanitizeError(procState.ggufPath)}` };
    }

    // Teardown existing process if running
    if (procState.process) {
      this.stopServer(modelKey);
    }

    const contextTokens = options?.contextTokens ?? 8192;
    const threads = options?.threads ?? 6;

    const args: string[] = [
      '-m', procState.ggufPath,
      '--host', '127.0.0.1',
      '--port', procState.port.toString(),
      '-c', contextTokens.toString(),
      '-t', threads.toString(),
      '-ngl', '0', // CPU mode (no GPU offload for UHD graphics)
    ];

    if (modelKey === 'glm' && procState.mmprojPath && fs.existsSync(procState.mmprojPath)) {
      args.push('--mmproj', procState.mmprojPath);
    }

    try {
      const child = spawn(llamaServerBin, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false,
      });

      procState.process = child;
      procState.pid = child.pid;

      child.on('error', (err) => {
        console.error(`[LocalLlamaCppAdapter] Server error for ${modelKey}:`, this.sanitizeError(err.message));
        procState.isReady = false;
      });

      child.on('exit', (code, signal) => {
        console.log(`[LocalLlamaCppAdapter] Server for ${modelKey} exited with code ${code} signal ${signal}`);
        procState.isReady = false;
        procState.process = null;
      });

      // Poll until ready (up to 30 seconds)
      const ready = await this.waitForServerReady(procState.baseUrl, 30000);
      procState.isReady = ready;

      if (!ready) {
        return { ok: false, error: `Server failed to initialize within timeout for ${modelKey}` };
      }

      return { ok: true, pid: child.pid };
    } catch (err: any) {
      return { ok: false, error: this.sanitizeError(err.message) };
    }
  }

  stopServer(modelKey: 'qwen' | 'glm' = 'qwen'): void {
    const procState = this.processes.get(modelKey);
    if (procState && procState.process) {
      try {
        procState.process.kill('SIGTERM');
      } catch {
        try { procState.process.kill('SIGKILL'); } catch {}
      }
      procState.process = null;
      procState.isReady = false;
    }
  }

  stopAllServers(): void {
    this.stopServer('qwen');
    this.stopServer('glm');
  }

  private async waitForServerReady(baseUrl: string, timeoutMs: number): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      try {
        const res = await fetch(`${baseUrl}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(1000),
        }).catch(async () => {
          return fetch(`${baseUrl}/v1/models`, {
            method: 'GET',
            signal: AbortSignal.timeout(1000),
          });
        });
        if (res.ok) return true;
      } catch {}
      await new Promise((r) => setTimeout(r, 500));
    }
    return false;
  }

  private sanitizeError(errStr: string): string {
    return errStr
      .replace(/C:\\Users\\[^\\]+/gi, 'C:\\Users\\***')
      .replace(/models--[a-zA-Z0-9_-]+/g, 'models--***');
  }
}

export const localLlamaCppAdapter = new LocalLlamaCppAdapter();
