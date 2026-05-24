/** WebSocket URL for the FastAPI Gemini Live proxy (`/ws/v1/speech/live`). */
export function liveWebSocketUrl(): string {
  const explicit = process.env.REACT_APP_WS_URL?.trim();
  if (explicit) {
    const u = explicit.replace(/\/$/, "");
    if (u.startsWith("http://"))
      return `ws://${u.slice("http://".length)}/ws/v1/speech/live`;
    if (u.startsWith("https://"))
      return `wss://${u.slice("https://".length)}/ws/v1/speech/live`;
    return `${u}/ws/v1/speech/live`;
  }
  const loc = window.location;
  const proto = loc.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${loc.host}/ws/v1/speech/live`;
}
