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

// Always-available NVIDIA models, pinned to the top so they show even if the
// /v1/models list omits or filters them.
const NVIDIA_PINNED: ModelOption[] = [
  // Fastest first — this is also the default model.
  { id: "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning", label: "Nemotron 3 Nano Omni 30B (fastest)", provider: "nvidia" },
  { id: "nvidia/nemotron-3-ultra-550b-a55b", label: "Nemotron 3 Ultra 550B", provider: "nvidia" },
  
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
        const seen = new Set<string>();
        const add = (m: ModelOption) => {
          if (!seen.has(m.id)) {
            seen.add(m.id);
            models.push(m);
          }
        };
        const nvidiaKey = process.env["NVIDIA_API_KEY"];

        // Pin the curated NVIDIA models first.
        for (const m of NVIDIA_PINNED) add(m);

        if (nvidiaKey) {
          try {
            const res = await fetch("https://integrate.api.nvidia.com/v1/models", {
              headers: { Authorization: `Bearer ${nvidiaKey}` },
            });
            if (res.ok) {
              const json = (await res.json()) as { data?: { id?: string }[] };
              const fetched: ModelOption[] = [];
              for (const entry of json.data ?? []) {
                const id = entry.id;
                if (!id || EXCLUDE.test(id)) continue;
                fetched.push({ id, label: prettify(id), provider: "nvidia" });
              }
              fetched.sort((a, b) => a.id.localeCompare(b.id));
              for (const m of fetched) add(m);
            }
          } catch {
            // fall through to gateway models
          }
        }

        if (process.env["LOVABLE_API_KEY"]) {
          for (const m of LOVABLE_MODELS) add(m);
        }

        const fallback: ModelOption = NVIDIA_PINNED[0]!;
        if (models.length === 0) models.push(fallback);

        return Response.json({
          models,
          defaultModel: nvidiaKey ? NVIDIA_PINNED[0]!.id : (models[0]?.id ?? fallback.id),
        });
      },
    },
  },
});
