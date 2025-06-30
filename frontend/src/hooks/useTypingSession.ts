import { useState, useEffect, useRef, useCallback } from "react";

export function useTypingSession(token: string) {
  // local state
  const [sessionId, setSessionId] = useState<number|null>(null);
  const [summary, setSummary]   = useState<any>(null);

  // buffer for raw keystroke events
  const eventsRef = useRef<
    { key: string; down_ts: number; up_ts: number }[]
  >([]);

  // common headers
  const authHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };

  // start a session
  useEffect(() => {
    fetch("/typing/sessions/start", {
      method: "POST",
      headers: authHeaders,
    })
    .then(res => res.json())
    .then(data => setSessionId(data.session_id))
    .catch(console.error);
  }, [token]);

  // capture down/up timestamps
  const recordKey = useCallback((e: KeyboardEvent) => {
    const t = performance.now() / 1000; // seconds since page load
    if (e.type === "keydown") {
      eventsRef.current.push({ key: e.key, down_ts: t, up_ts: t });
    } else {
      // find the most recent matching down without an updated up_ts
      for (let i = eventsRef.current.length - 1; i >= 0; i--) {
        if (
          eventsRef.current[i].key === e.key &&
          eventsRef.current[i].up_ts === eventsRef.current[i].down_ts
        ) {
          eventsRef.current[i].up_ts = t;
          break;
        }
      }
    }
  }, []);

  // upload, end, fetch summary
  async function finish() {
    if (sessionId == null) return;
    try {
      // a) upload the buffered keystrokes
      await fetch(`/typing/sessions/${sessionId}/keystrokes`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(eventsRef.current),
      });

      // b) mark session ended
      await fetch(`/typing/sessions/${sessionId}/end`, {
        method: "POST",
        headers: authHeaders,
      });

      // c) fetch your computed summary
      const r = await fetch(`/typing/sessions/${sessionId}/summary`, {
        headers: authHeaders,
      });
      setSummary(await r.json());
    } catch (err) {
      console.error(err);
    }
  }

  return { sessionId, summary, recordKey, finish };
}
