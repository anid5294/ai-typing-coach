import { useState, useEffect, useRef, useCallback } from "react";

export function useTypingSession(token: string) {
  // local state
  const [sessionId, setSessionId] = useState<number|null>(null);
  const [summary, setSummary]   = useState<any>(null);
  const [userInput, setUserInput] = useState<string>("");
  const [targetText, setTargetText] = useState<string>("");

  // buffer for raw keystroke events with enhanced data
  const eventsRef = useRef<
    { key: string; down_ts: number; up_ts: number; target_char?: string; position_in_text?: number; is_correction?: string; is_error?: string }[]
  >([]);
  
  // Track current position in text for analysis
  const currentPositionRef = useRef<number>(0);

  // common headers
  const authHeaders = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
  };

  // start a session
  useEffect(() => {
    const prompt = "The quick brown fox jumps over the lazy dog.";
    setTargetText(prompt);
    
    fetch("/typing/sessions/start", {
      method: "POST",
      headers: authHeaders,
      body: JSON.stringify({ prompt }),
    })
    .then(res => {
      if (!res.ok) {
        throw new Error(`Failed to start session: ${res.status}`);
      }
      return res.json();
    })
    .then(data => setSessionId(data.session_id))
    .catch(console.error);
  }, [token]);

  // capture down/up timestamps with enhanced analysis
  const recordKey = useCallback((e: KeyboardEvent) => {
    const t = performance.now() / 1000; // seconds since page load
    if (e.type === "keydown") {
      const pos = currentPositionRef.current;
      const targetChar = targetText[pos] || null;
      const isCorrection = ['Backspace', 'Delete'].includes(e.key) ? e.key.toLowerCase() : null;
      
      // Determine if this is an error by comparing with target
      let isError = null;
      if (e.key.length === 1 && targetChar && e.key !== targetChar) {
        isError = 'substitution';
      } else if (e.key.length === 1 && !targetChar && pos >= targetText.length) {
        isError = 'insertion';
      }
      
      eventsRef.current.push({ 
        key: e.key, 
        down_ts: t, 
        up_ts: t, 
        target_char: targetChar,
        position_in_text: pos,
        is_correction: isCorrection,
        is_error: isError
      });
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
  }, [targetText]);

  // Function to update user input and current position
  const updateUserInput = useCallback((input: string) => {
    setUserInput(input);
    currentPositionRef.current = input.length;
  }, []);

  // upload, end, fetch summary
  async function finish(finalUserInput: string) {
    if (sessionId == null) {
      console.error("No session ID available");
      return;
    }
    try {
      // a) upload the buffered keystrokes
      const keystrokesRes = await fetch(`/typing/sessions/${sessionId}/keystrokes`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify(eventsRef.current),
      });
      if (!keystrokesRes.ok) {
        throw new Error(`Failed to upload keystrokes: ${keystrokesRes.status}`);
      }

      // b) upload the final user input
      const inputRes = await fetch(`/typing/sessions/${sessionId}/input`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({ user_input: finalUserInput }),
      });
      if (!inputRes.ok) {
        throw new Error(`Failed to upload user input: ${inputRes.status}`);
      }

      // c) mark session ended
      const endRes = await fetch(`/typing/sessions/${sessionId}/end`, {
        method: "POST",
        headers: authHeaders,
      });
      if (!endRes.ok) {
        throw new Error(`Failed to end session: ${endRes.status}`);
      }

      // d) fetch your computed summary
      const summaryRes = await fetch(`/typing/sessions/${sessionId}/summary`, {
        headers: authHeaders,
      });
      if (!summaryRes.ok) {
        throw new Error(`Failed to fetch summary: ${summaryRes.status}`);
      }
      setSummary(await summaryRes.json());
    } catch (err) {
      console.error("Error in finish function:", err);
    }
  }

  return { sessionId, summary, recordKey, finish, updateUserInput, targetText };
}
