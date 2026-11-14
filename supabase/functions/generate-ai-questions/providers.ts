export type ProviderName = "gemini" | "openai";

export interface ProviderResult {
  text: string;
  tokensIn: number;
  tokensOut: number;
}

export interface ProviderSettings {
  provider: ProviderName;
  model: string;
  input_paise_per_million: number;
  output_paise_per_million: number;
}

export const PROVIDER_NAMES: ProviderName[] = ["gemini", "openai"];

const TIMEOUT_MS = 60_000;

async function callGemini(model: string, prompt: string, apiKey: string): Promise<ProviderResult> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.7 },
      }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    },
  );
  if (!response.ok) throw new Error(`Gemini responded with status ${response.status}`);
  const body = await response.json();
  const text = body?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (typeof text !== "string" || text.length === 0) throw new Error("Gemini returned no text");
  return {
    text,
    tokensIn: Number(body?.usageMetadata?.promptTokenCount ?? 0),
    tokensOut: Number(body?.usageMetadata?.candidatesTokenCount ?? 0),
  };
}

async function callOpenAi(model: string, prompt: string, apiKey: string): Promise<ProviderResult> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: prompt }],
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`OpenAI responded with status ${response.status}`);
  const body = await response.json();
  const text = body?.choices?.[0]?.message?.content;
  if (typeof text !== "string" || text.length === 0) throw new Error("OpenAI returned no text");
  return {
    text,
    tokensIn: Number(body?.usage?.prompt_tokens ?? 0),
    tokensOut: Number(body?.usage?.completion_tokens ?? 0),
  };
}

export function providerKeyName(provider: ProviderName): string {
  return provider === "gemini" ? "GEMINI_API_KEY" : "OPENAI_API_KEY";
}

export function callProvider(
  provider: ProviderName,
  model: string,
  prompt: string,
  apiKey: string,
): Promise<ProviderResult> {
  return provider === "gemini" ? callGemini(model, prompt, apiKey) : callOpenAi(model, prompt, apiKey);
}

export function costPaise(tokensIn: number, tokensOut: number, settings: ProviderSettings): number {
  const raw = (tokensIn * settings.input_paise_per_million + tokensOut * settings.output_paise_per_million) / 1_000_000;
  return Math.ceil(raw);
}
