import React, { useEffect } from "react";
import { useTypingSession } from "../hooks/useTypingSession";

export function TypingArea({ token }: { token: string }) {
  // pull in hook
  const { summary, recordKey, finish } = useTypingSession(token);

  // wire up global key listeners
  useEffect(() => {
    window.addEventListener("keydown", recordKey);
    window.addEventListener("keyup",   recordKey);
    return () => {
      window.removeEventListener("keydown", recordKey);
      window.removeEventListener("keyup",   recordKey);
    };
  }, [recordKey]);

  return (
    <div style={{ padding: 20 }}>
      <h2>Start typing below:</h2>
      <textarea
        style={{ width: "100%", height: 200 }}
        placeholder="Type here..."
      />
      <button onClick={finish} style={{ marginTop: 10 }}>
        Done
      </button>

      {summary && (
        <pre style={{
          marginTop: 20,
          background: "#f0f0f0",
          padding: 10,
          borderRadius: 4,
        }}>
          {JSON.stringify(summary, null, 2)}
        </pre>
      )}
    </div>
  );
}
