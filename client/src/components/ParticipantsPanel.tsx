interface User {
  id: string;
  name: string;
  role?: string;
}

interface Vote {
  userId: string;
  hasVoted: boolean;
}

interface ParticipantsPanelProps {
  users: User[];
  darkMode: boolean;
  focusedStoryVotes?: Vote[];
}

export const ParticipantsPanel = ({
  users,
  darkMode,
  focusedStoryVotes,
}: ParticipantsPanelProps) => {
  const participantCount = users.filter(u => u.role !== 'observer').length;
  const observerCount = users.filter(u => u.role === 'observer').length;

  const getUserVoteStatus = (userId: string): boolean | null => {
    if (!focusedStoryVotes) return null;
    const vote = focusedStoryVotes.find(v => v.userId === userId);
    return vote ? vote.hasVoted : false;
  };

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
        {users.map((user) => {
          const voteStatus = getUserVoteStatus(user.id);
          const hasVoted = voteStatus === true;
          const showVoteStatus = voteStatus !== null && user.role !== 'observer';

          return (
            <div key={user.id} style={styles.userItem}>
              <div style={styles.userInfo}>
                {showVoteStatus && (
                  <span style={styles.voteStatus}>
                    {hasVoted ? '✓' : '☐'}
                  </span>
                )}
                <span>{user.name}</span>
              </div>
              {user.role === 'observer' && (
                <span style={styles.observerBadge}>👁️</span>
              )}
            </div>
          );
        })}
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
    position: 'sticky',
    top: '20px',
    alignSelf: 'flex-start',
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
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  voteStatus: {
    fontSize: '16px',
    fontWeight: 'bold',
    minWidth: '20px',
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
