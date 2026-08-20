# Make Jarvis actually listen, think and speak

Right now Jarvis is a visual prototype: the orb, chat and terminal are wired to a simulated engine in `src/lib/jarvis-store.tsx` that picks a random canned reply, the mic button only flips an animation state, and nothing is ever spoken aloud. No AI model is connected and no speech APIs are used. This plan turns all three into real behaviour.

## 1. Real answers (thinking)

- Add a streaming AI endpoint at `src/routes/api/chat.ts` backed by Lovable AI (no external accounts or keys needed from you).
- Give Jarvis a system persona that respects the Settings screen: personality (concise / balanced / playful / technical) and terminal vs chat mode (terminal answers stay command-oriented and return code blocks).
- Replace the canned reply engine in the store with a real streaming call, keeping the existing behaviour that already works: word-by-word streaming into the bubble, `thinking` → `speaking` → `idle` activity states, Stop, and Retry last.
- Show clear errors instead of silence when the model is rate-limited or out of credits.

## 2. Real listening (voice input)

- Use the browser's built-in speech recognition in the mic button, so speech is transcribed live into the input bar while the orb is in `listening` state.
- Request the real microphone permission (the Status screen's permission state reflects the real answer instead of always granting).
- On end of speech, auto-send the transcript to Jarvis.
- Browsers without speech recognition (mainly Firefox) get a clear toast and keep typing as the fallback.

## 3. Real speaking (voice output)

- Speak Jarvis's replies aloud with the browser's speech synthesis as the answer streams in, mapped to the Settings voice controls (voice choice, speed, tone/pitch).
- The orb stays in `speaking` state while audio plays and returns to `idle` when it finishes; tapping the orb or pressing Stop cuts the speech off immediately.
- Add a mute/speaker toggle so voice output can be turned off, persisted with the other settings.

## Technical notes

- Backend: TanStack server route `POST /api/chat` streaming via the Lovable AI Gateway (model: `google/gemini-3.7-flash` for fast conversational latency); the API key stays server-side.
- Client: `src/lib/jarvis-store.tsx` gains an async `respond()` that reads the stream, plus a small `src/lib/speech.ts` wrapper around `SpeechRecognition` and `speechSynthesis` with feature detection and SSR guards.
- `Settings` gains a `speakReplies` flag; existing voice/speed/tone sliders map to synthesis parameters.
- Chat history remains local (localStorage) — no database is added unless you want cross-device history.
