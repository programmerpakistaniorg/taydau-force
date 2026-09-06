# TAYDAU FORCE — HUMAN LEARNING LOG & CONCEPT COMPASS

**Purpose:** Connect every AI-assisted code change to fundamental software engineering principles so the human developer builds deep mental models, understands the architecture, and can defend every technical decision.

---

## Work Item Entries

### Entry 1: Local Semantic Fallback & llama.cpp Subprocess Integration (`FEATURE-LOCAL-SEMANTIC-FALLBACK`)

#### 1. What We Changed
We added a third resilience tier to TayDau's Dynamic Model Router. If all external cloud providers (Groq, Experiential, OpenRouter) fail or get rate-limited, instead of immediately collapsing into degraded mock generation, the router automatically spawns a local `llama-server.exe` process hosting a 9B parameter quantized model (`Qwen3.5-9B-Q3_K_M.gguf`) on loopback `127.0.0.1:8081` to continue real semantic reasoning offline.

#### 2. Why We Changed It
Cloud APIs can experience downtime, rate limits (429), or network dropouts. If TayDau depended 100% on external APIs, an outage would break delivery. By having a verified local fallback tier, the autonomous workforce can still synthesize requirements, draft code, and generate tests locally without incurring API costs.

#### 3. Key Software Engineering Concepts
- **Provider Abstraction Pattern**: `LocalLlamaCppAdapter` implements the same `ProviderAdapter` TypeScript interface as `GroqProvider` and `ExperientialAdapter`. The calling agent never knows or cares whether inference runs in the cloud or on local CPU.
- **Failover Chain & Circuit Breaking**: The `DynamicModelRouter` implements multi-tiered fallback: Tier 1 (Cloud) $\to$ Tier 2 (Local Semantic) $\to$ Tier 3 (Deterministic Degraded).
- **Loopback Binding Security**: The adapter strictly enforces that local HTTP communication only ever talks to `127.0.0.1` or `localhost`. This prevents Server-Side Request Forgery (SSRF) or accidental exposure of the model to the local network.
- **Subprocess Isolation**: Instead of loading C++ bindings directly into Node.js (which can crash the whole server on a segmentation fault), we run `llama-server.exe` as an isolated child process with its own memory space.
- **Quantization ($Q3\_K\_M$)**: Compressing model weights from 16-bit floats to 3-bit integers reduces RAM requirements from 18GB to 4.35GB, allowing a 9B model to run on an average laptop.

#### 4. How the Flow Works
1. `RoutedModelGateway` asks `DynamicModelRouter` for a route.
2. If cloud providers have high failure counts or cooldowns in `ProviderHealthTracker`, the router selects `local_llamacpp/local/qwen3.5-9b`.
3. `LocalLlamaCppAdapter.startServer()` checks if `llama-server.exe` is already listening on `127.0.0.1:8081`. If not, it spawns it via safe arguments.
4. The adapter sends standard OpenAI-compatible `/v1/chat/completions` requests.
5. The output is parsed with the multi-token brace extractor to strip any preamble thoughts.
6. If the local server is also offline, it cascades to `DeterministicGenerator` with `degradedMode: true`.

#### 5. Important Files
- `server/src/gateway/providers/local-llamacpp-adapter.ts`: Manages subprocess lifecycle and OpenAI HTTP client.
- `server/src/gateway/dynamic-model-router.ts`: Tiered candidate filtering and failover logic.
- `server/src/gateway/routing-registry.ts`: Declares capabilities, cost ($0.00), and trust level (`LOCAL_TRUSTED`).
- `server/scripts/test_live_local_models.ts`: Benchmark test that spawns server, measures tok/s, and tests Zod validation.

#### 6. What Could Go Wrong
- **High CPU Latency**: On CPUs without GPU offload, generating 300 tokens takes 1–2 minutes. Calling agents must configure adequate execution timeouts (e.g. 180s+).
- **RAM Contention**: If both Qwen and GLM servers are launched simultaneously on a 16GB RAM machine, system memory pressure will increase.
- **Preamble Hallucination**: Small reasoning models output thinking text that can break strict `JSON.parse` if not stripped via robust brace extraction.

#### 7. How We Tested It
- **Contract Tests (`test_local_llamacpp_integration.ts`)**: 37 assertions testing schema registration, loopback security, path sanitization, and 3-tier failover simulation.
- **Live Local Benchmark (`test_live_local_models.ts`)**: Spawed `llama-server.exe`, verified 128 tok smoke latency ($\sim$2.4 tok/s), and verified structured requirements output passed Zod `BARequirementsSchema`.

#### 8. What I Should Be Able to Explain
- *“How does TayDau handle internet dropouts during autonomous delivery?”*  
  $\to$ Explain the 3-tier failover hierarchy: Cloud $\to$ Local llama.cpp $\to$ Deterministic generator.
- *“Why is local semantic fallback NOT considered degraded mode?”*  
  $\to$ Because Qwen 3.5 9B satisfies Tier 3 reasoning and code generation quality floors; it is a true semantic LLM, unlike static mock templates.
