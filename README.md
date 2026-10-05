# AI Gateway

A small, provider-agnostic, OpenAI-compatible AI gateway for personal developer tooling.

## Goal

Expose one API endpoint to clients such as OpenCode while keeping provider credentials on the gateway.

```
OpenCode
   |
   v
AI Gateway
   |
   +-- OpenAI
   +-- Gemini
   +-- Anthropic
   +-- Groq
   +-- OpenRouter
```

The gateway is designed for an edge/serverless runtime rather than a persistent Node server, local SQLite database, or always-on personal computer.

## API contract

The public API is intentionally OpenAI-compatible:

- `GET /v1/models`
- `POST /v1/chat/completions`

The initial implementation establishes authentication, provider configuration, streaming-compatible pass-through, and retryable-provider fallback. Provider adapters and richer routing policies are being added incrementally.

## Security model

Provider API keys are deployment secrets/environment variables. They must never be committed to Git.

The client receives only:

- the gateway URL
- one gateway authentication key

Provider credentials remain server-side.

## Environment

Copy `.env.example` to `.env` for local development.

`PROVIDER_ORDER` controls the fallback order. Only configured providers are eligible.

Example:

```
PROVIDER_ORDER=openai,groq,openrouter
```

## Local development

Requirements:

- Node.js 20+
- npm
- Netlify CLI

Install:

```bash
npm install
```

Run:

```bash
npm run dev
```

Type-check:

```bash
npm run typecheck
```

## Deployment

The repository is structured for Netlify Edge Functions. Connect the repository to Netlify and configure the secrets in Netlify's environment-variable settings.

Do not put API keys in `netlify.toml`, source files, or committed `.env` files.

## Roadmap

1. Gateway contract and authentication
2. OpenAI-compatible provider adapter
3. Streaming
4. Automatic fallback/routing
5. Gemini adapter
6. Anthropic adapter
7. Provider health and cooldown logic
8. Virtual models such as `auto` and `code`
9. Management UI
10. Optional persistent configuration
11. OpenCode integration tests
