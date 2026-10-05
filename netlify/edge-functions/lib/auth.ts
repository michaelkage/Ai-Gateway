export function isAuthorized(request: Request): boolean {
  const expected = Netlify.env.get("GATEWAY_API_KEY");

  if (!expected) {
    return false;
  }

  const authorization = request.headers.get("authorization");
  const supplied = authorization?.match(/^Bearer\s+(.+)$/i)?.[1];

  return supplied === expected;
}
