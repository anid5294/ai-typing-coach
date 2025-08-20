import React, { useState, useEffect } from "react";
import "./SessionManager.css";

interface SessionManagerProps {
  token: string;
  onStartNewSession: (prompt?: string) => Promise<number>;
  onRestartSession: () => Promise<number>;
  getSessionHistory: (limit?: number, offset?: number) => Promise<any>;
  getCharacterProblems: (limit?: number) => Promise<any>;
  getProgressAnalytics: (days?: number) => Promise<any>;
  onSelectPrompt: (prompt: string) => void;
}

export function SessionManager({
  token,
  onStartNewSession,
  onRestartSession,
  getSessionHistory,
  getCharacterProblems,
  getProgressAnalytics,
  onSelectPrompt,
}: SessionManagerProps) {
  const [activeTab, setActiveTab] = useState<'new' | 'history' | 'analytics'>('new');
  const [sessionHistory, setSessionHistory] = useState<any>(null);
  const [characterProblems, setCharacterProblems] = useState<any>(null);
  const [progressAnalytics, setProgressAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");

  // Predefined prompts for practice
  const predefinedPrompts = [
    "The quick brown fox jumps over the lazy dog.",
    "Pack my box with five dozen liquor jugs.",
    "How vexingly quick daft zebras jump!",
    "Waltz, bad nymph, for quick jigs vex.",
    "Sphinx of black quartz, judge my vow.",
    "Programming is the art of telling another human being what one wants the computer to do.",
    "In the world of software development, debugging is twice as hard as writing the code in the first place.",
    "The best way to predict the future is to implement it.",
  ];

  const loadData = async (type: 'history' | 'problems' | 'analytics') => {
    setLoading(true);
    setError(null);
    
    try {
      switch (type) {
        case 'history':
          const historyData = await getSessionHistory(20, 0);
          setSessionHistory(historyData);
          break;
        case 'problems':
          const problemsData = await getCharacterProblems(15);
          setCharacterProblems(problemsData);
          break;
        case 'analytics':
          const analyticsData = await getProgressAnalytics(30);
          setProgressAnalytics(analyticsData);
          break;
      }
    } catch (err: any) {
      setError(err.message || `Failed to load ${type} data`);
    } finally {
      setLoading(false);
    }
  };

  const handleStartNewSession = async (prompt?: string) => {
    setLoading(true);
    setError(null);
    
    try {
      await onStartNewSession(prompt);
    } catch (err: any) {
      setError(err.message || "Failed to start new session");
    } finally {
      setLoading(false);
    }
  };

  const handleRestartSession = async () => {
    setLoading(true);
    setError(null);
    
    try {
      await onRestartSession();
    } catch (err: any) {
      setError(err.message || "Failed to restart session");
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString() + ' ' + 
           new Date(dateString).toLocaleTimeString();
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➡️';
      default: return '❓';
    }
  };

  return (
    <div className="session-manager">
      <div className="tab-navigation">
        <button 
          className={`tab-button ${activeTab === 'new' ? 'active' : ''}`}
          onClick={() => setActiveTab('new')}
        >
          New Session
        </button>
        <button 
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('history');
            loadData('history');
          }}
        >
          Session History
        </button>
        <button 
          className={`tab-button ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('analytics');
            loadData('problems');
            loadData('analytics');
          }}
        >
          Analytics
        </button>
      </div>

      {error && (
        <div className="error-message">{error}</div>
      )}

      {activeTab === 'new' && (
        <div className="new-session-tab">
          <h3>Start New Session</h3>
          
          <div className="session-controls">
            <button 
              className="primary-button"
              onClick={() => handleStartNewSession()}
              disabled={loading}
            >
              {loading ? "Starting..." : "Start Default Session"}
            </button>
            
            <button 
              className="secondary-button"
              onClick={handleRestartSession}
              disabled={loading}
            >
              {loading ? "Restarting..." : "Restart Current Session"}
            </button>
          </div>

          <div className="prompt-selection">
            <h4>Choose a Practice Text:</h4>
            <div className="predefined-prompts">
              {predefinedPrompts.map((prompt, index) => (
                <button
                  key={index}
                  className="prompt-button"
                  onClick={() => handleStartNewSession(prompt)}
                  disabled={loading}
                >
                  {prompt.substring(0, 50)}...
                </button>
              ))}
            </div>
          </div>

          <div className="custom-prompt">
            <h4>Or Enter Custom Text:</h4>
            <textarea
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="Enter your custom practice text here..."
              className="custom-prompt-input"
              rows={4}
            />
            <button
              className="primary-button"
              onClick={() => handleStartNewSession(customPrompt)}
              disabled={loading || !customPrompt.trim()}
            >
              {loading ? "Starting..." : "Start Custom Session"}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="history-tab">
          <h3>Session History</h3>
          {loading ? (
            <div className="loading">Loading session history...</div>
          ) : sessionHistory ? (
            <div className="session-history">
              <p>{sessionHistory.total_count} total sessions</p>
              <div className="session-list">
                {sessionHistory.sessions.map((session: any) => (
                  <div key={session.id} className="session-item">
                    <div className="session-info">
                      <div className="session-date">{formatDate(session.started_at)}</div>
                      <div className="session-text">{session.target_text.substring(0, 100)}...</div>
                    </div>
                    <div className="session-stats">
                      <span className="stat">
                        {session.words_per_minute?.toFixed(1) || 0} WPM
                      </span>
                      <span className="stat">
                        {session.accuracy_percentage?.toFixed(1) || 0}% Accuracy
                      </span>
                      <span className="stat">
                        {session.error_count || 0} Errors
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div>No session history available</div>
          )}
        </div>
      )}

      {activeTab === 'analytics' && (
        <div className="analytics-tab">
          <h3>Typing Analytics</h3>
          
          {loading ? (
            <div className="loading">Loading analytics...</div>
          ) : (
            <>
              {progressAnalytics && (
                <div className="progress-analytics">
                  <h4>Progress Overview (Last 30 Days)</h4>
                  <div className="analytics-grid">
                    <div className="analytics-card">
                      <div className="analytics-value">{progressAnalytics.sessions_analyzed}</div>
                      <div className="analytics-label">Sessions</div>
                    </div>
                    <div className="analytics-card">
                      <div className="analytics-value">{progressAnalytics.avg_wpm?.toFixed(1)}</div>
                      <div className="analytics-label">Avg WPM</div>
                    </div>
                    <div className="analytics-card">
                      <div className="analytics-value">{progressAnalytics.avg_accuracy?.toFixed(1)}%</div>
                      <div className="analytics-label">Avg Accuracy</div>
                    </div>
                    <div className="analytics-card">
                      <div className="analytics-value">
                        {getTrendIcon(progressAnalytics.improvement_trend)} {progressAnalytics.improvement_trend}
                      </div>
                      <div className="analytics-label">Trend</div>
                    </div>
                    <div className="analytics-card">
                      <div className="analytics-value">{formatDuration(progressAnalytics.total_practice_time)}</div>
                      <div className="analytics-label">Practice Time</div>
                    </div>
                  </div>
                </div>
              )}
              
              {characterProblems && (
                <div className="character-problems">
                  <h4>Most Problematic Characters</h4>
                  <div className="problems-list">
                    {characterProblems.problematic_characters.map((problem: any, index: number) => (
                      <div key={index} className="problem-item">
                        <div className="problem-char">'{problem.character}'</div>
                        <div className="problem-stats">
                          <span>{problem.error_count} errors</span>
                          <span>{problem.error_rate.toFixed(1)}% error rate</span>
                          <span>{problem.total_typed} times typed</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <p className="problems-note">
                    Based on analysis of {characterProblems.total_sessions_analyzed} sessions
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
