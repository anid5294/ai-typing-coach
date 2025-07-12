import React, { useEffect, useState } from "react";
import { useTypingSession } from "../hooks/useTypingSession";
import "./TypingArea.css";

export function TypingArea({ token }: { token: string }) {
  // pull in hook
  const { sessionId, summary, recordKey, finish, updateUserInput, targetText } = useTypingSession(token);
  const [isFinishing, setIsFinishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userInput, setUserInput] = useState("");
  const [currentPosition, setCurrentPosition] = useState(0);

  const handleFinish = async () => {
    setIsFinishing(true);
    setError(null);
    try {
      await finish(userInput);
    } catch (err: any) {
      setError(err.message || "Failed to finish session");
    } finally {
      setIsFinishing(false);
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newInput = e.target.value;
    setUserInput(newInput);
    setCurrentPosition(newInput.length);
    updateUserInput(newInput);
  };
  
  const renderTextWithHighlight = () => {
    return targetText.split('').map((char, index) => {
      let className = '';
      if (index < userInput.length) {
        className = userInput[index] === char ? 'correct' : 'error';
      } else if (index === userInput.length) {
        className = 'current';
      }
      return (
        <span key={index} className={className}>
          {char}
        </span>
      );
    });
  };

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
      <h2>Typing Session</h2>
      {sessionId ? (
        <>
          <div style={{ marginBottom: 16 }}>
            <strong>Type this text:</strong>
            <div className="typing-display">
              {renderTextWithHighlight()}
            </div>
          </div>
          <textarea
            className="typing-input"
            style={{ width: "100%" }}
            placeholder="Start typing here..."
            value={userInput}
            onChange={handleInputChange}
          />
          {error && (
            <div style={{ color: "red", marginTop: 8 }}>{error}</div>
          )}
          <button 
            onClick={handleFinish} 
            disabled={isFinishing}
            style={{ marginTop: 10, padding: "8px 16px", fontSize: "14px" }}
          >
            {isFinishing ? "Finishing..." : "Finish Session"}
          </button>
        </>
      ) : (
        <div>Loading session...</div>
      )}

      {summary && (
        <div style={{ marginTop: 20 }}>
          <h3>Session Results</h3>
          <div className="stats-display">
            <div className="stat-item">
              <div className="stat-value">{summary.wpm?.toFixed(1) || 0}</div>
              <div className="stat-label">WPM</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{summary.accuracy_percentage?.toFixed(1) || 0}%</div>
              <div className="stat-label">Accuracy</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{summary.error_count || 0}</div>
              <div className="stat-label">Errors</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{summary.correction_count || 0}</div>
              <div className="stat-label">Corrections</div>
            </div>
          </div>
          
          {summary.error_details && summary.error_details.total_errors > 0 && (
            <div style={{ marginTop: 15 }}>
              <h4>Error Analysis</h4>
              
              {summary.error_details.substitutions.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <strong>Substitutions:</strong>
                  <ul>
                    {summary.error_details.substitutions.map((error, index) => (
                      <li key={index}>
                        Position {error.position}: typed '{error.actual}' instead of '{error.expected}'
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {summary.error_details.insertions.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <strong>Extra characters:</strong>
                  <ul>
                    {summary.error_details.insertions.map((error, index) => (
                      <li key={index}>
                        Position {error.position}: extra '{error.actual}'
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {summary.error_details.deletions.length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <strong>Missing characters:</strong>
                  <ul>
                    {summary.error_details.deletions.map((error, index) => (
                      <li key={index}>
                        Position {error.position}: missing '{error.expected}'
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              
              {Object.keys(summary.error_details.problematic_characters).length > 0 && (
                <div style={{ marginBottom: 10 }}>
                  <strong>Most problematic characters:</strong>
                  <ul>
                    {Object.entries(summary.error_details.problematic_characters)
                      .sort(([,a], [,b]) => b - a)
                      .slice(0, 5)
                      .map(([char, count]) => (
                        <li key={char}>
                          '{char}': {count} errors
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          
          <details style={{ marginTop: 15 }}>
            <summary>Raw Data</summary>
            <pre style={{
              marginTop: 10,
              background: "#f0f0f0",
              padding: 10,
              borderRadius: 4,
              fontSize: 12,
              overflow: 'auto',
              maxHeight: 300
            }}>
              {JSON.stringify(summary, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
