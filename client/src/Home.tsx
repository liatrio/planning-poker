import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Notification } from './components/Notification';
import { SessionEntryForm } from './components/SessionEntryForm';

const STORAGE_KEY_USERNAME = 'planning_poker_username';
const STORAGE_KEY_SESSION = 'planning_poker_last_session';
const STORAGE_KEY_DARK_MODE = 'planning_poker_dark_mode';

export const Home = () => {
  const [userName, setUserName] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [storedSession, setStoredSession] = useState<string | null>(null);
  const [showRejoinPrompt, setShowRejoinPrompt] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_DARK_MODE);
    return stored === 'true';
  });
  const navigate = useNavigate();

  useEffect(() => {
    const savedUsername = localStorage.getItem(STORAGE_KEY_USERNAME);
    const savedSession = localStorage.getItem(STORAGE_KEY_SESSION);

    if (savedUsername) {
      setUserName(savedUsername);
    }

    if (savedSession) {
      setStoredSession(savedSession);
      setShowRejoinPrompt(true);
    }
  }, []);

  const rejoinSession = () => {
    if (!storedSession || !userName.trim()) {
      setNotification('Please enter your name');
      return;
    }

    localStorage.setItem(STORAGE_KEY_USERNAME, userName);
    localStorage.setItem(STORAGE_KEY_SESSION, storedSession);
    navigate(`/session/${storedSession}`);
  };

  const dismissRejoin = () => {
    setShowRejoinPrompt(false);
    setStoredSession(null);
  };

  const createSession = async () => {
    if (!userName.trim()) {
      setNotification('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/session', {
        method: 'POST',
      });
      const data = await response.json();

      localStorage.setItem(STORAGE_KEY_USERNAME, userName);
      localStorage.setItem(STORAGE_KEY_SESSION, data.sessionId);

      navigate(`/session/${data.sessionId}`);
    } catch (error) {
      console.error('Error creating session:', error);
      setNotification('Failed to create session');
    } finally {
      setLoading(false);
    }
  };

  const joinSession = () => {
    if (!userName.trim()) {
      setNotification('Please enter your name');
      return;
    }

    if (!sessionId.trim()) {
      setNotification('Please enter a session ID');
      return;
    }

    localStorage.setItem(STORAGE_KEY_USERNAME, userName);
    localStorage.setItem(STORAGE_KEY_SESSION, sessionId);

    navigate(`/session/${sessionId}`);
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem(STORAGE_KEY_DARK_MODE, String(newMode));
  };

  const colors = darkMode ? {
    background: '#1a1a1a',
    surface: '#2d2d2d',
    surfaceHover: '#3d3d3d',
    text: '#e0e0e0',
    textSecondary: '#b0b0b0',
    border: '#404040',
    primary: '#4a9eff',
    primaryHover: '#3d8ae0',
  } : {
    background: '#f5f5f5',
    surface: '#ffffff',
    surfaceHover: '#f9f9f9',
    text: '#333',
    textSecondary: '#666',
    border: '#e0e0e0',
    primary: '#007bff',
    primaryHover: '#0056b3',
  };

  const styles = getStyles(colors);

  return (
    <div style={styles.container}>
      <button onClick={toggleDarkMode} style={styles.darkModeButton}>
        {darkMode ? '☀️' : '🌙'}
      </button>
      <SessionEntryForm
        userName={userName}
        sessionId={sessionId}
        loading={loading}
        showRejoinPrompt={showRejoinPrompt}
        storedSession={storedSession}
        darkMode={darkMode}
        onUserNameChange={setUserName}
        onSessionIdChange={setSessionId}
        onCreateSession={createSession}
        onJoinSession={joinSession}
        onRejoinSession={rejoinSession}
        onDismissRejoin={dismissRejoin}
      />
      {notification && (
        <Notification message={notification} onClose={() => setNotification(null)} />
      )}
    </div>
  );
};

const getStyles = (colors: any): { [key: string]: React.CSSProperties } => ({
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.background,
    padding: '20px',
    position: 'relative',
  },
  darkModeButton: {
    position: 'absolute',
    top: '20px',
    right: '20px',
    padding: '8px 16px',
    fontSize: '18px',
    backgroundColor: colors.surface,
    color: colors.text,
    border: `2px solid ${colors.border}`,
    borderRadius: '4px',
    cursor: 'pointer',
  },
});
