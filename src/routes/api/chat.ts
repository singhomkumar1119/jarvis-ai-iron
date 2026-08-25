import { createFileRoute } from "@tanstack/react-router";
import { streamText, type ModelMessage } from "ai";
import {
  createLovableAiGatewayProvider,
  createNvidiaProvider,
  getLovableAiGatewayRunId,
} from "@/lib/ai-gateway.server";

type ChatRequestBody = {
  messages?: { role: "user" | "assistant"; content: string }[];
  channel?: "chat" | "terminal";
  personality?: string;
  model?: string;
};

const PERSONALITY: Record<string, string> = {
  concise: "Answer in as few words as possible. No filler, no preamble.",
  balanced: "Answer clearly and warmly, with just enough detail to be useful.",
  playful: "Answer with wit and a light, charming tone, while still being accurate.",
  technical: "Answer with precise technical depth, naming exact tools, commands and trade-offs.",
};

function systemPrompt(channel: "chat" | "terminal", personality: string) {
  const tone = PERSONALITY[personality] ?? PERSONALITY["balanced"]!;
  const base = `You are Jarvis, a calm, capable personal AI assistant with a cinematic, futuristic presence. ${tone} Never mention which AI model or vendor powers you.`;
  if (channel === "terminal") {
    return `${base}\nYou are answering in a developer terminal. Be command-oriented: give the exact command or code first inside a fenced code block with a language tag, then at most two short lines of explanation. You cannot actually execute commands on the user's machine — say so if asked to.`;
  }
  return `${base}\nKeep replies conversational and suitable to be read aloud: short paragraphs, no markdown tables, no long bullet lists. Use fenced code blocks only when the user asks for code.`;
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = (await request.json()) as ChatRequestBody;
        const messages = body.messages;
        if (!Array.isArray(messages) || messages.length === 0) {
          return new Response("Messages are required", { status: 400 });
        }

        const nvidiaKey = process.env["NVIDIA_API_KEY"];
        const key = process.env["LOVABLE_API_KEY"];
        if (!nvidiaKey && !key) {
          return new Response("AI is not configured for this app.", { status: 500 });
        }

        const channel = body.channel === "terminal" ? "terminal" : "chat";
        const requested = typeof body.model === "string" ? body.model.trim() : "";
        // Lovable gateway ids are vendor-prefixed with google/ or openai/; everything else is NVIDIA.
        const useLovable = requested
          ? /^(google|openai)\//.test(requested) && Boolean(key)
          : !nvidiaKey;
        const model = useLovable
          ? createLovableAiGatewayProvider(key!, getLovableAiGatewayRunId(request))(
              requested || "google/gemini-3.7-flash",
            )
          : createNvidiaProvider(nvidiaKey!)(
              requested || "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
            );

        const modelMessages: ModelMessage[] = [
          ...messages
            .filter((m) => typeof m.content === "string" && m.content.trim().length > 0)
            .slice(-20)
            .map((m) => ({ role: m.role, content: m.content }) as ModelMessage),
        ];

        // Gemini rejects requests ending on an assistant turn.
        const last = modelMessages[modelMessages.length - 1];
        if (!last || last.role !== "user") {
          return new Response("The last message must come from the user.", { status: 400 });
        }

        const errorMessage = (error: unknown) => {
          const status =
            typeof error === "object" && error && "statusCode" in error
              ? Number((error as { statusCode?: number }).statusCode) || 500
              : 500;
          if (status === 429) return "Jarvis is rate limited right now. Try again in a moment.";
          if (status === 402) return "Jarvis is out of AI credits. Add credits in Lovable to continue.";
          const detail =
            typeof error === "object" && error && "message" in error
              ? String((error as { message?: string }).message ?? "")
              : "";
          return `Jarvis couldn't reach the AI gateway.${detail ? ` (${detail.slice(0, 200)})` : ""}`;
        };

        try {
          const result = streamText({
            model,
            system: systemPrompt(channel, body.personality ?? "balanced"),
            messages: modelMessages,
            abortSignal: request.signal,
          });

          // Stream manually so mid-stream failures and empty completions (some
          // reasoning models emit no visible text) never surface as a blank reply.
          const encoder = new TextEncoder();
          const stream = new ReadableStream<Uint8Array>({
            async start(controller) {
              let emitted = 0;
              try {
                for await (const chunk of result.textStream) {
                  if (!chunk) continue;
                  emitted += chunk.length;
                  controller.enqueue(encoder.encode(chunk));
                }
                if (emitted === 0) {
                  controller.enqueue(
                    encoder.encode(
                      "Jarvis had nothing to say for that. Try rephrasing, or pick another model in the picker.",
                    ),
                  );
                }
              } catch (error) {
                if (!request.signal.aborted) {
                  controller.enqueue(encoder.encode((emitted ? "\n\n" : "") + errorMessage(error)));
                }
              } finally {
                controller.close();
              }
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/plain; charset=utf-8",
              "Cache-Control": "no-cache, no-transform",
            },
          });
        } catch (error) {
          return new Response(errorMessage(error), { status: 500 });
        }
      },
    },
  },
});
