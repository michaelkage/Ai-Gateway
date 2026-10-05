import type { ProviderConfig } from "./providers.ts";

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

  for (const provider of providers) {
    try {
      const response = await fetch(provider.baseUrl + "/chat/completions", {
        method: "POST",
        headers: {
          authorization: "Bearer " + provider.apiKey,
          "content-type": "application/json",
        },
        body: JSON.stringify(requestBody),
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

function isRetryable(status: number): boolean {
  return status === 408 || status === 409 || status === 429 || status >= 500;
}
