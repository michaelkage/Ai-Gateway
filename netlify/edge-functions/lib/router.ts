import type { ProviderConfig } from "./providers.ts";

interface ChatRequest {
  model?: string;
  [key: string]: unknown;
}

export async function forwardChatCompletion(
  requestBody: unknown,
  providers: ProviderConfig[],
): Promise<Response> {
  if (providers.length === 0) {
    return Response.json(
      {
        error: {
          message: "No AI providers are configured.",
          type: "configuration_error",
        },
      },
      { status: 503 },
    );
  }

  const body = isChatRequest(requestBody) ? requestBody : null;

  if (!body) {
    return Response.json(
      {
        error: {
          message: "Request body must be a JSON object.",
          type: "invalid_request_error",
        },
      },
      { status: 400 },
    );
  }

  for (const provider of providers) {
    const upstreamBody = {
      ...body,
      model:
        !body.model || body.model === "auto" || body.model === "omni-auto"
          ? provider.defaultModel
          : body.model,
    };

    try {
      const response = await fetch(provider.baseUrl + "/chat/completions", {
        method: "POST",
        headers: {
          authorization: "Bearer " + provider.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(upstreamBody),
      });

      if (response.ok || !isRetryable(response.status)) {
        return response;
      }
    } catch {
      // Try the next provider.
    }
  }

  return Response.json(
    {
      error: {
        message: "All configured AI providers failed.",
        type: "upstream_error",
      },
    },
    { status: 502 },
  );
}

function isChatRequest(value: unknown): value is ChatRequest {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isRetryable(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}
