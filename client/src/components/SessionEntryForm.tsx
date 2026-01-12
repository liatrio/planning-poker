interface SessionEntryFormProps {
  userName: string;
  sessionId: string;
  loading: boolean;
  showRejoinPrompt: boolean;
  storedSession: string | null;
  darkMode: boolean;
  onUserNameChange: (name: string) => void;
  onSessionIdChange: (id: string) => void;
  onCreateSession: () => void;
  onJoinSession: () => void;
  onRejoinSession: () => void;
  onDismissRejoin: () => void;
}

export const SessionEntryForm = ({
  userName,
  sessionId,
  loading,
  showRejoinPrompt,
  storedSession,
  darkMode,
  onUserNameChange,
  onSessionIdChange,
  onCreateSession,
  onJoinSession,
  onRejoinSession,
  onDismissRejoin,
}: SessionEntryFormProps) => {
  const colors = darkMode ? {
    background: '#1a1a1a',
    surface: '#2d2d2d',
    surfaceHover: '#3d3d3d',
    text: '#e0e0e0',
    textSecondary: '#b0b0b0',
    border: '#404040',
    primary: '#4a9eff',
  } : {
    background: '#f5f5f5',
    surface: '#ffffff',
    surfaceHover: '#f9f9f9',
    text: '#333',
    textSecondary: '#666',
    border: '#e0e0e0',
    primary: '#007bff',
  };

  const styles = getStyles(colors);

  return (
    <div style={styles.card}>
      <h1 style={styles.title}>Planning Poker</h1>
      <p style={styles.subtitle}>Estimate user stories with your team</p>

      {showRejoinPrompt && storedSession ? (
        <div style={styles.form}>
          <div style={styles.rejoinMessage}>
            <p style={styles.rejoinText}>Welcome back, {userName}!</p>
            <p style={styles.rejoinSubtext}>
              Would you like to rejoin your last session?
            </p>
            <p style={styles.sessionIdText}>Session: {storedSession}</p>
          </div>

          <input
            type="text"
            placeholder="Your name"
            value={userName}
            onChange={(e) => onUserNameChange(e.target.value)}
            style={styles.input}
          />

          <button onClick={onRejoinSession} style={styles.primaryButton}>
            Rejoin Session
          </button>

          <div style={styles.divider}>
            <span style={styles.dividerText}>OR</span>
          </div>

          <button
            onClick={() => {
              onDismissRejoin();
              onCreateSession();
            }}
            disabled={loading}
            style={styles.secondaryButton}
          >
            {loading ? 'Creating...' : 'Start New Session'}
          </button>

          <button onClick={onDismissRejoin} style={styles.textButton}>
            Enter Different Session ID
          </button>
        </div>
      ) : (
        <div style={styles.form}>
          <input
            type="text"
            placeholder="Your name"
            value={userName}
            onChange={(e) => onUserNameChange(e.target.value)}
            style={styles.input}
          />

          <button
            onClick={onCreateSession}
            disabled={loading}
            style={styles.primaryButton}
          >
            {loading ? 'Creating...' : 'Create New Session'}
          </button>

          <div style={styles.divider}>
            <span style={styles.dividerText}>OR</span>
          </div>

          <input
            type="text"
            placeholder="Session ID"
            value={sessionId}
            onChange={(e) => onSessionIdChange(e.target.value)}
            style={styles.input}
          />

          <button onClick={onJoinSession} style={styles.secondaryButton}>
            Join Existing Session
          </button>
        </div>
      )}
    </div>
  );
};

const getStyles = (colors: any): { [key: string]: React.CSSProperties } => ({
  card: {
    backgroundColor: colors.surface,
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    padding: '40px',
    maxWidth: '400px',
    width: '100%',
  },
  title: {
    fontSize: '32px',
    fontWeight: 'bold',
    marginBottom: '8px',
    textAlign: 'center',
    color: colors.text,
  },
  subtitle: {
    fontSize: '16px',
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: '32px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  input: {
    padding: '12px',
    fontSize: '16px',
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    outline: 'none',
    backgroundColor: colors.surface,
    color: colors.text,
  },
  primaryButton: {
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '12px',
    fontSize: '16px',
    fontWeight: '600',
    backgroundColor: colors.surface,
    color: colors.primary,
    border: `2px solid ${colors.primary}`,
    borderRadius: '4px',
    cursor: 'pointer',
  },
  divider: {
    position: 'relative',
    textAlign: 'center',
    margin: '8px 0',
  },
  dividerText: {
    backgroundColor: colors.surface,
    padding: '0 16px',
    color: colors.textSecondary,
    fontSize: '14px',
  },
  rejoinMessage: {
    textAlign: 'center',
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: colors.surfaceHover,
    borderRadius: '8px',
  },
  rejoinText: {
    fontSize: '20px',
    fontWeight: '600',
    color: colors.text,
    marginBottom: '8px',
  },
  rejoinSubtext: {
    fontSize: '14px',
    color: colors.textSecondary,
    marginBottom: '8px',
  },
  sessionIdText: {
    fontSize: '12px',
    color: colors.primary,
    fontFamily: 'monospace',
    marginTop: '8px',
  },
  textButton: {
    padding: '12px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: 'transparent',
    color: colors.primary,
    border: 'none',
    cursor: 'pointer',
    textDecoration: 'underline',
  },
});
