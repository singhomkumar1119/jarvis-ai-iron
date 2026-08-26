# Self-healing Jarvis replies

## Implementation
- Make Gemini 3.7 Flash the default whenever Lovable AI is configured, while keeping both Nemotron models selectable.
- Consume the AI SDK `fullStream` so visible text is streamed normally and reasoning text is retained as a fallback.
- If a model completes without visible text, return its reasoning summary when usable; otherwise make one streamed fallback request to Gemini. Never retry terminal gateway errors.
- Mark empty, HTTP-error, and connection-failure assistant messages as errors so the existing Retry control remains available and obvious.

## Technical details
- Preserve request cancellation and plain-text streaming expected by the current client.
- Keep gateway errors visible, with no automatic retry except the specific successful-but-empty completion case.
- Verify the models endpoint, a real chat request, and the rendered retry state.
