interface VotingPanelProps {
  fibonacciValues: string[];
  selectedVote: string | null;
  isRevealed: boolean;
  onVote: (value: string, event?: React.MouseEvent<HTMLButtonElement>) => void;
  darkMode: boolean;
}

export const VotingPanel = ({
  fibonacciValues,
  selectedVote,
  isRevealed,
  onVote,
  darkMode,
}: VotingPanelProps) => {
  const colors = darkMode ? {
    text: '#e0e0e0',
    surface: '#2d2d2d',
    border: '#404040',
    primary: '#4a9eff',
  } : {
    text: '#333',
    surface: '#ffffff',
    border: '#e0e0e0',
    primary: '#007bff',
  };

  const styles = getStyles(colors);

  return (
    <div style={styles.votingArea}>
      <style>
        {`
          button.vote-card:focus {
            outline: none !important;
            box-shadow: none !important;
          }
          button.vote-card:focus-visible {
            outline: none !important;
            box-shadow: none !important;
          }
        `}
      </style>
      <h3 style={styles.votingTitle}>
        {isRevealed ? 'Voting Complete' : 'Choose your estimate'}
      </h3>
      <div style={styles.cardGrid}>
        {fibonacciValues.map((value) => {
          const isSelected = selectedVote === value;
          const isDisabled = isRevealed;
          return (
            <button
              key={value}
              className="vote-card"
              onClick={(e) => onVote(value, e)}
              disabled={isDisabled}
              style={{
                ...styles.card,
                ...(isSelected ? styles.cardSelected : styles.cardUnselected),
                ...(isDisabled ? styles.cardDisabled : {}),
              }}
            >
              {value}
            </button>
          );
        })}
      </div>
    </div>
  );
};

const getStyles = (colors: any): { [key: string]: React.CSSProperties } => ({
  votingArea: {
    marginTop: '24px',
  },
  votingTitle: {
    fontSize: '18px',
    fontWeight: '600',
    marginBottom: '16px',
    color: colors.text,
  },
  cardGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
    gap: '12px',
  },
  card: {
    aspectRatio: '2/3',
    fontSize: '32px',
    fontWeight: 'bold',
    cursor: 'pointer',
    transition: 'all 0.2s',
    outline: 'none',
    borderRadius: '8px',
  },
  cardUnselected: {
    backgroundColor: colors.surface,
    color: colors.text,
    border: `2px solid ${colors.border}`,
    transform: 'scale(1)',
  },
  cardSelected: {
    backgroundColor: colors.primary,
    color: 'white',
    border: `2px solid ${colors.primary}`,
    transform: 'scale(1.05)',
  },
  cardDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
    outline: 'none',
  },
});
