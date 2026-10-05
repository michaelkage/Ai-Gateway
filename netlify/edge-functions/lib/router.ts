import type { ProviderConfig, ProviderName } from "./providers";

interface ChatRequest {
  model?: unknown;
  messages?: unknown;
  stream?: unknown;
  [key: string]: unknown;
}

const PROVIDER_NAMES: ProviderName[] = [
  "openai",
  "gemini",
  "groq",
  "openrouter",
];

export async function forwardChatCompletion(
  requestBody: unknown,
  providers: ProviderConfig[],
): Promise<Response> {
  const validation = validateChatRequest(requestBody);

  if (!validation.ok) {
    return errorResponse(validation.message, 400, "invalid_request_error");
  }

  if (providers.length === 0) {
    return errorResponse(
      "No AI providers are configured.",
      503,
      "configuration_error",
    );
  }

  const body = validation.body;
  const routes = resolveRoutes(body.model, providers);

  if (!routes.ok) {
    return errorResponse(routes.message, 400, "invalid_request_error");
  }

  let lastRetryableStatus: number | null = null;

  for (const provider of routes.providers) {
    const upstreamBody = {
      ...body,
      model: routes.modelFor(provider),
    };

    try {
      const response = await fetchWithTimeout(
        provider.baseUrl.replace(/\/$/, "") + "/chat/completions",
        {
          method: "POST",
          headers: {
            authorization: "Bearer " + provider.apiKey,
            "content-type": "application/json",
          },
          body: JSON.stringify(upstreamBody),
        },
      );

      if (response.ok || !isRetryable(response.status)) {
        return response;
      }

      lastRetryableStatus = response.status;
    } catch {
      // A network error or timeout is retryable. Continue to the next provider.
    }
  }

  return errorResponse(
    lastRetryableStatus
      ? "All configured AI providers failed."
      : "All configured AI providers timed out or were unreachable.",
    502,
    "upstream_error",
  );
}

function validateChatRequest(
  value: unknown,
): { ok: true; body: ChatRequest } | { ok: false; message: string } {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return { ok: false, message: "Request body must be a JSON object." };
  }

  const body = value as ChatRequest;

  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    return {
      ok: false,
      message: "Request must include a non-empty messages array.",
    };
  }

  if (body.model !== undefined && typeof body.model !== "string") {
    return { ok: false, message: "model must be a string." };
  }

  if (body.stream !== undefined && typeof body.stream !== "boolean") {
    return { ok: false, message: "stream must be a boolean." };
  }

  return { ok: true, body };
}

function resolveRoutes(
  requestedModel: unknown,
  providers: ProviderConfig[],
):
  | {
      ok: true;
      providers: ProviderConfig[];
      modelFor: (provider: ProviderConfig) => string;
    }
  | { ok: false; message: string } {
  const model =
    typeof requestedModel === "string" && requestedModel.trim()
      ? requestedModel.trim()
      : "auto";

  if (model === "auto" || model === "omni-auto" || model === "code") {
    return {
      ok: true,
      providers,
      modelFor: (provider) => provider.defaultModel,
    };
  }

  const slash = model.indexOf("/");

  if (slash > 0) {
    const prefix = model.slice(0, slash).toLowerCase();
    const provider = providers.find((item) => item.name === prefix);

    if (!PROVIDER_NAMES.includes(prefix as ProviderName)) {
      return {
        ok: false,
        message:
          "Unknown model provider prefix. Use auto, a provider/model name, or a provider-native model ID.",
      };
    }

    if (!provider) {
      return {
        ok: false,
        message: `Provider "${prefix}" is not configured.`,
      };
    }

    const providerModel = model.slice(slash + 1).trim();

    if (!providerModel) {
      return { ok: false, message: "Provider model name cannot be empty." };
    }

    return {
      ok: true,
      providers: [provider],
      modelFor: () => providerModel,
    };
  }

  return {
    ok: true,
    providers,
    modelFor: () => model,
  };
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit,
): Promise<Response> {
  const rawTimeout = Number(Netlify.env.get("UPSTREAM_TIMEOUT_MS") ?? "30000");
  const timeoutMs =
    Number.isFinite(rawTimeout) && rawTimeout >= 1000
      ? Math.min(rawTimeout, 120000)
      : 30000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

function isRetryable(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}

function errorResponse(message: string, status: number, type: string): Response {
  return Response.json(
    {
      error: {
        message,
        type,
      },
    },
    { status },
  );
}
