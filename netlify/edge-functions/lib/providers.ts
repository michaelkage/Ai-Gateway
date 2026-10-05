export type ProviderName = "openai" | "gemini" | "groq" | "openrouter";

export interface ProviderConfig {
  name: ProviderName;
  apiKey: string;
  baseUrl: string;
  defaultModel: string;
}

const DEFAULTS: Record<ProviderName, { baseUrl: string; model: string }> = {
  openai: {
    baseUrl: "https://api.openai.com/v1",
    model: "gpt-5",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    model: "gemini-3.8-flash",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1",
    model: "llama-3.3-70b-versatile",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1",
    model: "openai/gpt-5",
  },
};

export function getProvider(name: ProviderName): ProviderConfig | null {
  const prefix = name.toUpperCase();
  const apiKey = Netlify.env.get(prefix + "_API_KEY");

  if (!apiKey) return null;

  return {
    name,
    apiKey,
    baseUrl: Netlify.env.get(prefix + "_BASE_URL") ?? DEFAULTS[name].baseUrl,
    defaultModel: Netlify.env.get(prefix + "_MODEL") ?? DEFAULTS[name].model,
  };
}

export function getConfiguredProviders(): ProviderConfig[] {
  const raw =
    Netlify.env.get("PROVIDER_ORDER") ??
    "openai,gemini,groq,openrouter";

  return raw
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value): value is ProviderName =>
      ["openai", "gemini", "groq", "openrouter"].includes(value),
    )
    .map(getProvider)
    .filter((provider): provider is ProviderConfig => provider !== null);
}
