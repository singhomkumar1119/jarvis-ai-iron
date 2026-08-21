import { createFileRoute } from "@tanstack/react-router";
import { streamText, type ModelMessage } from "ai";
import { createLovableAiGatewayProvider, getLovableAiGatewayRunId } from "@/lib/ai-gateway.server";

type ChatRequestBody = {
  messages?: { role: "user" | "assistant"; content: string }[];
  channel?: "chat" | "terminal";
  personality?: string;
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

        const key = process.env["LOVABLE_API_KEY"];
        if (!key) {
          return new Response("AI is not configured for this app.", { status: 500 });
        }

        const channel = body.channel === "terminal" ? "terminal" : "chat";
        const gateway = createLovableAiGatewayProvider(key, getLovableAiGatewayRunId(request));

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

        try {
          const result = streamText({
            model: gateway("google/gemini-3.7-flash"),
            system: systemPrompt(channel, body.personality ?? "balanced"),
            messages: modelMessages,
            abortSignal: request.signal,
          });

          return result.toTextStreamResponse();
        } catch (error) {
          const status =
            typeof error === "object" && error && "statusCode" in error
              ? Number((error as { statusCode?: number }).statusCode) || 500
              : 500;
          const message =
            status === 429
              ? "Jarvis is rate limited right now. Try again in a moment."
              : status === 402
                ? "Jarvis is out of AI credits. Add credits in Lovable to continue."
                : "Jarvis couldn't reach the AI gateway.";
          return new Response(message, { status });
        }
      },
    },
  },
});
