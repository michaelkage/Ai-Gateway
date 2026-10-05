import { isAuthorized } from "./lib/auth.ts";
import { getConfiguredProviders } from "./lib/providers.ts";
import { forwardChatCompletion } from "./lib/router.ts";

export default async function handler(request: Request): Promise<Response> {
  if (!isAuthorized(request)) {
    return Response.json(
      {
        error: {
          message: "Unauthorized.",
          type: "authentication_error",
        },
      },
      { status: 401 },
    );
  }

  const url = new URL(request.url);

  if (request.method === "GET" && url.pathname === "/v1/models") {
    return Response.json({
      object: "list",
      data: [
        {
          id: "auto",
          object: "model",
          owned_by: "ai-gateway",
        },
      ],
    });
  }

  if (request.method === "POST" && url.pathname === "/v1/chat/completions") {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return Response.json(
        {
          error: {
            message: "Request body must be valid JSON.",
            type: "invalid_request_error",
          },
        },
        { status: 400 },
      );
    }

    return forwardChatCompletion(body, getConfiguredProviders());
  }

  return Response.json(
    {
      error: {
        message: "Endpoint not found.",
        type: "invalid_request_error",
      },
    },
    { status: 404 },
  );
}

export const config = {
  path: "/v1/*",
};
