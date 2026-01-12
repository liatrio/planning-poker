interface User {
  id: string;
  name: string;
}

interface Vote {
  userId: string;
  hasVoted: boolean;
  value?: string;
}

interface Story {
  id: string;
  name: string;
  description?: string;
  url?: string;
  revealed: boolean;
  votes: Vote[];
}

interface ParticipantsPanelProps {
  users: User[];
  currentStory: Story | null;
  darkMode: boolean;
}

export const ParticipantsPanel = ({
  users,
  currentStory,
  darkMode,
}: ParticipantsPanelProps) => {
  const colors = darkMode ? {
    surface: '#2d2d2d',
    surfaceHover: '#3d3d3d',
    text: '#e0e0e0',
  } : {
    surface: '#ffffff',
    surfaceHover: '#f9f9f9',
    text: '#333',
  };

  const styles = getStyles(colors);

  return (
    <div style={styles.sidebar}>
      <h2 style={styles.sectionTitle}>Participants ({users.length})</h2>
      <div style={styles.userList}>
        {users.map((user) => (
          <div key={user.id} style={styles.userItem}>
            <span>{user.name}</span>
            {currentStory && (
              <span style={styles.voteStatus}>
                {currentStory.votes.find(v => v.userId === user.id)?.hasVoted ? '✓' : '○'}
              </span>
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
    marginBottom: '16px',
    color: colors.text,
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
});
