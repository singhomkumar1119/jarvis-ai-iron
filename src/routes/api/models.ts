import { createFileRoute } from "@tanstack/react-router";

export type ModelOption = {
  id: string;
  label: string;
  provider: "nvidia" | "lovable";
};

const LOVABLE_MODELS: ModelOption[] = [
  { id: "google/gemini-3.7-flash", label: "Gemini 3.7 Flash", provider: "lovable" },
  { id: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro", provider: "lovable" },
  { id: "google/gemini-3.1-flash-lite", label: "Gemini 3.1 Flash Lite", provider: "lovable" },
  { id: "openai/gpt-5.6-terra", label: "GPT-5.6 Terra", provider: "lovable" },
  { id: "openai/gpt-5.6-luna", label: "GPT-5.6 Luna", provider: "lovable" },
];

const EXCLUDE = /embed|rerank|bge|nv-embed|guard|ocr|retrieval|clip|asr|tts|riva|speech|paraphrase|nemoguard|safety|reward|parakeet|canary|diffusion|stable|sana|edify|florence|molmo|vila|codesearch/i;

function prettify(id: string) {
  const [vendor, ...rest] = id.split("/");
  const name = (rest.join("/") || id)
    .replace(/-/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return `${name} · ${vendor}`;
}

export const Route = createFileRoute("/api/models")({
  server: {
    handlers: {
      GET: async () => {
        const models: ModelOption[] = [];
        const nvidiaKey = process.env["NVIDIA_API_KEY"];

        if (nvidiaKey) {
          try {
            const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
              headers: { Authorization: `Bearer ${nvidiaKey}` },
            });
            if (res.ok) {
              const json = (await res.json()) as { data?: { id?: string }[] };
              for (const entry of json.data ?? []) {
                const id = entry.id;
                if (!id || EXCLUDE.test(id)) continue;
                models.push({ id, label: prettify(id), provider: "nvidia" });
              }
              models.sort((a, b) => a.id.localeCompare(b.id));
            }
          } catch {
            // fall through to gateway models
          }
        }

        if (process.env["LOVABLE_API_KEY"]) {
          models.push(...LOVABLE_MODELS);
        }

        const fallback: ModelOption = {
          id: "meta/llama-3.3-70b-instruct",
          label: "Llama 3.3 70B Instruct · meta",
          provider: "nvidia",
        };
        if (models.length === 0) models.push(fallback);

        return Response.json({
          models,
          defaultModel: nvidiaKey ? fallback.id : (models[0]?.id ?? fallback.id),
        });
      },
    },
  },
});
