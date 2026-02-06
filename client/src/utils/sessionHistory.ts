const STORAGE_KEY_SESSION_HISTORY = 'planning_poker_session_history';

export interface SessionHistoryItem {
  sessionId: string;
  lastJoined: number;
}

export const addToSessionHistory = (sessionId: string) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SESSION_HISTORY);
    let history: SessionHistoryItem[] = stored ? JSON.parse(stored) : [];

    // Remove existing entry if present
    history = history.filter(item => item.sessionId !== sessionId);

    // Add new entry at the beginning
    history.unshift({
      sessionId,
      lastJoined: Date.now(),
    });

    // Keep only the 10 most recent sessions
    history = history.slice(0, 10);

    localStorage.setItem(STORAGE_KEY_SESSION_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to save session history:', e);
  }
};

export const getSessionHistory = (): SessionHistoryItem[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SESSION_HISTORY);
    return stored ? JSON.parse(stored) : [];
  } catch (e) {
    console.error('Failed to load session history:', e);
    return [];
  }
};

export const removeFromSessionHistory = (sessionId: string) => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY_SESSION_HISTORY);
    let history: SessionHistoryItem[] = stored ? JSON.parse(stored) : [];

    history = history.filter(item => item.sessionId !== sessionId);

    localStorage.setItem(STORAGE_KEY_SESSION_HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to remove from session history:', e);
  }
};

export const clearSessionHistory = () => {
  try {
    localStorage.removeItem(STORAGE_KEY_SESSION_HISTORY);
  } catch (e) {
    console.error('Failed to clear session history:', e);
  }
};
