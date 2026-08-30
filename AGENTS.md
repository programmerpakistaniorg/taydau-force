# TayDau Force Engineering Rules

## Project

TayDau Force is an autonomous software delivery organization.

The current application contains an interactive concept prototype. Development must progressively replace simulated behavior with real implementation without breaking the existing demo.

## Core principles

1. Preserve the current user interface unless a task explicitly requires UI changes.
2. Do not remove working prototype features.
3. Do not claim simulated behavior is live AI behavior.
4. Prefer small verified changes over large rewrites.
5. Every engineering task must have clear acceptance criteria.
6. Developers cannot approve their own implementation.
7. Deterministic tools must verify deterministic facts.
8. Security is part of the development lifecycle.
9. Never expose API keys, credentials, secrets, or environment variables.
10. Never commit .env files.
11. Generated code must eventually execute inside isolated environments.
12. Maintain requirement-to-task-to-test traceability.
13. Use structured data contracts between agents and services.
14. Avoid unnecessary dependencies.
15. Run tests and production build after meaningful changes.
16. Do not introduce Kubernetes until Docker-based MVP execution works.
17. Do not create a separate AI agent for tasks better implemented as deterministic tools.
18. Keep model/provider access behind a Model Gateway abstraction.
19. Log AI usage and failures so Cost Governor integration remains possible.
20. Stop and request approval before destructive or high-risk actions.

## Current stack

Frontend:
- React
- TypeScript
- Vite
- Tailwind CSS
- React Router

Current state:
- Static interactive concept prototype
- Client-side simulation
- Mock data
- No real agent orchestration yet
- No production backend yet

## MVP target

Build one complete real vertical slice:

Client Brief
→ Business Analysis
→ Project Planning
→ Architecture
→ Task Creation
→ Engineering Execution
→ Automated Test
→ Independent QA
→ Defect/Rework
→ Verification

Do not attempt to implement every planned specialist before this loop works.

## Quality

Before marking any coding task complete:

- run TypeScript checks
- run relevant tests
- run npm run build
- inspect failures
- report evidence

A feature is not complete merely because code was generated.