export type ProviderName = "openai" | "groq" | "openrouter";

export interface ProviderConfig {
  name: ProviderName;
  apiKey: string;
  baseUrl: string;
}

const DEFAULT_BASE_URLS: Record<ProviderName, string> = {
  openai: "https://api.openai.com/v1",
  groq: "https://api.groq.com/openai/v1",
  openrouter: "https://openrouter.ai/api/v1",
};

export function getProvider(name: ProviderName): ProviderConfig | null {
  const key = Netlify.env.get(name.toUpperCase() + "_API_KEY");

  if (!key) {
    return null;
  }

  return {
    name,
    apiKey: key,
    baseUrl:
      Netlify.env.get(name.toUpperCase() + "_BASE_URL") ??
      DEFAULT_BASE_URLS[name],
  };
}

export function getConfiguredProviders(): ProviderConfig[] {
  const raw = Netlify.env.get("PROVIDER_ORDER") ?? "";

  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is ProviderName =>
      ["openai", "groq", "openrouter"].includes(value),
    )
    .map(getProvider)
    .filter((provider): provider is ProviderConfig => provider !== null);
}
