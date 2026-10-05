import { isAuthorized } from "./lib/auth.ts";
import {
  getConfiguredProviders,
  type ProviderConfig,
} from "./lib/providers.ts";
import { forwardChatCompletion } from "./lib/router.ts";

const CORS_HEADERS = {
  "access-control-allow-headers": "Authorization, Content-Type",
  "access-control-allow-methods": "GET, POST, OPTIONS",
  "access-control-allow-origin": "*",
};

export default async function handler(request: Request): Promise<Response> {
  const url = new URL(request.url);

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (url.pathname === "/v1/health") {
    return json(
      {
        status: "ok",
        service: "ai-gateway",
        providers_configured: getConfiguredProviders().length,
      },
      200,
    );
  }

  if (!isAuthorized(request)) {
    return json(
      {
        error: {
          message: "Unauthorized.",
          type: "authentication_error",
        },
      },
      401,
    );
  }

  if (request.method === "GET" && url.pathname === "/v1/models") {
    return json(buildModelList(getConfiguredProviders()), 200);
  }

  if (request.method === "POST" && url.pathname === "/v1/chat/completions") {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return json(
        {
          error: {
            message: "Request body must be valid JSON.",
            type: "invalid_request_error",
          },
        },
        400,
      );
    }

    return withCors(
      await forwardChatCompletion(body, getConfiguredProviders()),
    );
  }

  return json(
    {
      error: {
        message: "Endpoint not found.",
        type: "invalid_request_error",
      },
    },
    404,
  );
}

function buildModelList(providers: ProviderConfig[]) {
  const data = [
    {
      id: "auto",
      object: "model",
      owned_by: "ai-gateway",
    },
    {
      id: "code",
      object: "model",
      owned_by: "ai-gateway",
    },
  ];

  for (const provider of providers) {
    data.push({
      id: `${provider.name}/${provider.defaultModel}`,
      object: "model",
      owned_by: provider.name,
    });
  }

  return {
    object: "list",
    data,
  };
}

function json(body: unknown, status: number): Response {
  return withCors(Response.json(body, { status }));
}

function withCors(response: Response): Response {
  const headers = new Headers(response.headers);

  for (const [key, value] of Object.entries(CORS_HEADERS)) {
    headers.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

export const config = {
  path: "/v1/*",
};
