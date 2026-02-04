interface VotingPanelProps {
  fibonacciValues: string[];
  selectedVote: string | null;
  selectedModifier: string | null;
  isRevealed: boolean;
  onVote: (value: string, event?: React.MouseEvent<HTMLButtonElement>) => void;
  onSetModifier: (modifier: string | null) => void;
  darkMode: boolean;
}

export const VotingPanel = ({
  fibonacciValues,
  selectedVote,
  selectedModifier,
  isRevealed,
  onVote,
  onSetModifier,
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
        <button
          className="vote-card"
          onClick={(e) => onVote('abstain', e)}
          disabled={isRevealed}
          style={{
            ...styles.card,
            ...styles.abstainCard,
            ...(selectedVote === 'abstain' ? styles.abstainCardSelected : styles.abstainCardUnselected),
            ...(isRevealed ? styles.cardDisabled : {}),
          }}
        >
          Abstain
        </button>
      </div>

      {!isRevealed && (
        <div style={styles.modifiersSection}>
          <h4 style={styles.modifiersTitle}>Vote Modifiers (Optional)</h4>
          <div style={styles.modifiersGrid}>
            <button
              onClick={() => onSetModifier('soft_up')}
              style={{
                ...styles.modifierButton,
                ...(selectedModifier === 'soft_up' ? styles.modifierSelected : styles.modifierUnselected),
              }}
            >
              ↑ Soft Up
            </button>
            <button
              onClick={() => onSetModifier('soft_down')}
              style={{
                ...styles.modifierButton,
                ...(selectedModifier === 'soft_down' ? styles.modifierSelected : styles.modifierUnselected),
              }}
            >
              ↓ Soft Down
            </button>
            <button
              onClick={() => onSetModifier('question')}
              style={{
                ...styles.modifierButton,
                ...(selectedModifier === 'question' ? styles.modifierSelected : styles.modifierUnselected),
              }}
            >
              ? Question
            </button>
          </div>
          <p style={styles.modifiersHelp}>
            <strong>Soft Up/Down:</strong> If team votes 1 above/below, match theirs. <strong>Question:</strong> Need to discuss more.
          </p>
        </div>
      )}
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
    aspectRatio: '2/1',
    fontSize: '24px',
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
  abstainCard: {
    fontSize: '16px',
    gridColumn: 'span 2',
  },
  abstainCardUnselected: {
    backgroundColor: colors.surface,
    color: colors.text,
    border: `2px dashed ${colors.border}`,
    transform: 'scale(1)',
  },
  abstainCardSelected: {
    backgroundColor: '#808080',
    color: 'white',
    border: '2px dashed #808080',
    transform: 'scale(1.05)',
  },
  modifiersSection: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: `1px solid ${colors.border}`,
  },
  modifiersTitle: {
    fontSize: '16px',
    fontWeight: '600',
    marginBottom: '12px',
    color: colors.text,
  },
  modifiersGrid: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  modifierButton: {
    padding: '8px 16px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'all 0.2s',
    outline: 'none',
    border: `2px solid ${colors.border}`,
  },
  modifierUnselected: {
    backgroundColor: colors.surface,
    color: colors.text,
  },
  modifierSelected: {
    backgroundColor: colors.primary,
    color: 'white',
    border: `2px solid ${colors.primary}`,
  },
  modifiersHelp: {
    fontSize: '12px',
    color: colors.text,
    marginTop: '12px',
    opacity: 0.7,
  },
});
