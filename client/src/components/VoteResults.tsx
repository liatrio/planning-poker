interface Vote {
  userId: string;
  userName: string;
  value: string | null;
}

interface VoteResultsProps {
  revealedVotes: Vote[] | null;
  average: string | null;
  darkMode: boolean;
}

export const VoteResults = ({
  revealedVotes,
  average,
  darkMode,
}: VoteResultsProps) => {
  if (!revealedVotes) return null;

  const colors = darkMode ? {
    surfaceHover: '#3d3d3d',
    surface: '#2d2d2d',
    text: '#e0e0e0',
    textSecondary: '#b0b0b0',
    primary: '#4a9eff',
  } : {
    surfaceHover: '#f9f9f9',
    surface: '#ffffff',
    text: '#333',
    textSecondary: '#666',
    primary: '#007bff',
  };

  const styles = getStyles(colors);

  return (
    <div style={styles.results}>
      <h3 style={styles.resultsTitle}>Results</h3>
      {average && (
        <div style={styles.average}>Average: {average}</div>
      )}
      <div style={styles.votesGrid}>
        {revealedVotes.map((vote) => (
          <div key={vote.userId} style={styles.voteResult}>
            <div style={styles.voteName}>{vote.userName}</div>
            <div style={styles.voteValue}>{vote.value ?? '-'}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

const getStyles = (colors: any): { [key: string]: React.CSSProperties } => ({
  results: {
    marginBottom: '24px',
    padding: '20px',
    backgroundColor: colors.surfaceHover,
    borderRadius: '8px',
  },
  resultsTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '12px',
    color: colors.text,
  },
  average: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: '16px',
  },
  votesGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
    gap: '12px',
  },
  voteResult: {
    padding: '12px',
    backgroundColor: colors.surface,
    borderRadius: '4px',
    textAlign: 'center',
  },
  voteName: {
    fontSize: '14px',
    color: colors.textSecondary,
    marginBottom: '4px',
  },
  voteValue: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: colors.text,
  },
});
