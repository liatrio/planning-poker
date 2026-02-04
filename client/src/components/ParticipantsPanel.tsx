interface User {
  id: string;
  name: string;
  role?: string;
}

interface ParticipantsPanelProps {
  users: User[];
  darkMode: boolean;
}

export const ParticipantsPanel = ({
  users,
  darkMode,
}: ParticipantsPanelProps) => {
  const participantCount = users.filter(u => u.role !== 'observer').length;
  const observerCount = users.filter(u => u.role === 'observer').length;

  const colors = darkMode ? {
    surface: '#2d2d2d',
    surfaceHover: '#3d3d3d',
    text: '#e0e0e0',
    textSecondary: '#b0b0b0',
    observerBadge: '#6c757d',
  } : {
    surface: '#ffffff',
    surfaceHover: '#f9f9f9',
    text: '#333',
    textSecondary: '#666',
    observerBadge: '#6c757d',
  };

  const styles = getStyles(colors);

  return (
    <div style={styles.sidebar}>
      <h2 style={styles.sectionTitle}>Participants ({participantCount})</h2>
      {observerCount > 0 && (
        <div style={styles.observerCount}>Observers: {observerCount}</div>
      )}
      <div style={styles.userList}>
        {users.map((user) => (
          <div key={user.id} style={styles.userItem}>
            <span>{user.name}</span>
            {user.role === 'observer' && (
              <span style={styles.observerBadge}>👁️ Observer</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const getStyles = (colors: any): { [key: string]: React.CSSProperties } => ({
  sidebar: {
    backgroundColor: colors.surface,
    borderRadius: '8px',
    padding: '20px',
    minWidth: '250px',
    height: 'fit-content',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '8px',
    color: colors.text,
  },
  observerCount: {
    fontSize: '14px',
    color: colors.textSecondary,
    marginBottom: '16px',
  },
  userList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  userItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px',
    backgroundColor: colors.surfaceHover,
    borderRadius: '4px',
    color: colors.text,
  },
  voteStatus: {
    fontSize: '18px',
    color: '#28a745',
  },
  observerBadge: {
    fontSize: '12px',
    backgroundColor: colors.observerBadge,
    color: 'white',
    padding: '2px 8px',
    borderRadius: '12px',
    fontWeight: '600',
  },
});
