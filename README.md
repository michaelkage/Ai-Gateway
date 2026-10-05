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
   +-- Groq
   +-- OpenRouter
```

The gateway is designed for an edge/serverless runtime rather than a persistent Node server, local database, or always-on personal computer.

## API

The public API is intentionally OpenAI-compatible:

- `GET /v1/health`
- `GET /v1/models`
- `POST /v1/chat/completions`

Authentication uses:

```
Authorization: Bearer <GATEWAY_API_KEY>
```

Chat completions are streamed through unchanged when the client sends `"stream": true`.

## Model routing

Use `auto` for normal automatic fallback:

```json
{
  "model": "auto",
  "messages": [
    { "role": "user", "content": "Hello" }
  ]
}
```

The gateway sends `auto` to providers in `PROVIDER_ORDER`, using each provider's configured default model.

Provider-prefixed model names force a specific provider:

- `openai/<model>`
- `gemini/<model>`
- `groq/<model>`
- `openrouter/<model>`

For example, OpenRouter models containing their own slash work as:

```
openrouter/<provider>/<model>
```

The `code` virtual model currently behaves like `auto` and is reserved for a future code-focused routing policy.

## Environment

Copy `.env.example` to `.env` for local development.

Required:

```
GATEWAY_API_KEY=...
```

Configure any providers you want:

```
PROVIDER_ORDER=openai,gemini,groq,openrouter

OPENAI_API_KEY=...
OPENAI_MODEL=...

GEMINI_API_KEY=...
GEMINI_MODEL=...

GROQ_API_KEY=...
GROQ_MODEL=...

OPENROUTER_API_KEY=...
OPENROUTER_MODEL=...
```

Each provider also has an optional `*_BASE_URL` override.

`UPSTREAM_TIMEOUT_MS` controls the maximum time allowed for one upstream request. The gateway defaults to 30 seconds and caps configured values at 120 seconds.

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

Build:

```bash
npm run build
```

## Deployment

The repository is structured for Netlify Edge Functions.

1. Connect the GitHub repository to Netlify.
2. Keep the build settings from `netlify.toml`.
3. Add `GATEWAY_API_KEY` and provider API keys in Netlify environment variables.
4. Deploy.
5. Check `/v1/health`.
6. Configure OpenCode with the gateway URL and gateway key.

Never put provider API keys in `netlify.toml`, source files, or committed `.env` files.

## OpenCode configuration concept

Use the gateway as an OpenAI-compatible provider:

```
Base URL: https://<your-site>.netlify.app/v1
API key: <your GATEWAY_API_KEY>
Model: auto
```

The exact OpenCode configuration shape depends on the OpenCode version, so the gateway itself does not depend on a specific client configuration format.

## Current safeguards

- Gateway authentication
- Provider secrets kept server-side
- Request validation
- Upstream request timeout
- Retry/fallback on network errors, timeouts, 408, 409, 429, and 5xx responses
- Provider-specific routing
- CORS support
- Health endpoint
- CI typecheck/build validation

## Roadmap

1. Provider health/cooldown state
2. Better upstream error propagation
3. Anthropic adapter
4. More explicit virtual routing policies
5. Gateway key rotation
6. OpenCode integration tests
7. Optional management UI
8. Optional persistent configuration
