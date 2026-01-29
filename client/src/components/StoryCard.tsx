import { VoteResults } from './VoteResults';
import { VotingPanel } from './VotingPanel';

interface Story {
  id: string;
  name: string;
  description?: string;
  url?: string;
  revealed: boolean;
  isFocused?: boolean;
  votes: Array<{ userId: string; hasVoted: boolean; value?: string; modifier?: string }>;
}

interface RevealedVote {
  userId: string;
  userName: string;
  value: string | null;
}

interface StoryCardProps {
  story: Story;
  fibonacciValues: string[];
  selectedVote: string | null;
  selectedModifier: string | null;
  showIframe: boolean;
  revealedVotes: RevealedVote[] | null;
  average: string | null;
  voteCount: number;
  totalUsers: number;
  darkMode: boolean;
  isFocused?: boolean;
  isCollapsed?: boolean;
  currentUserId: string | null;
  onEditStory: () => void;
  onFocusStory?: () => void;
  onUnfocusStory?: () => void;
  onRevealVotes: () => void;
  onResetVotes: () => void;
  onToggleCollapse?: () => void;
  onToggleIframe: () => void;
  onVote: (value: string, event?: React.MouseEvent<HTMLButtonElement>) => void;
  onSetModifier: (modifier: string | null) => void;
}

export const StoryCard = ({
  story,
  fibonacciValues,
  selectedVote,
  selectedModifier,
  showIframe,
  revealedVotes,
  average,
  voteCount,
  totalUsers,
  darkMode,
  isFocused,
  isCollapsed,
  currentUserId,
  onEditStory,
  onFocusStory,
  onUnfocusStory,
  onRevealVotes,
  onResetVotes,
  onToggleCollapse,
  onToggleIframe,
  onVote,
  onSetModifier,
}: StoryCardProps) => {
  const colors = darkMode ? {
    surface: '#2d2d2d',
    text: '#e0e0e0',
    textSecondary: '#b0b0b0',
    border: '#404040',
    primary: '#4a9eff',
    focusBorder: '#4a9eff',
  } : {
    surface: '#ffffff',
    text: '#333',
    textSecondary: '#666',
    border: '#e0e0e0',
    primary: '#007bff',
    focusBorder: '#007bff',
  };

  const styles = getStyles(colors, isFocused, isCollapsed);

  // Determine status icon
  const myVote = story.votes.find(v => v.userId === currentUserId);
  const hasVoted = myVote?.hasVoted || false;
  const statusIcon = hasVoted ? '✓' : '☐';

  // Check if any user has question modifier
  const hasQuestions = story.votes.some(v => v.modifier === 'question');

  return (
    <div style={styles.storyCard}>
      <div style={styles.collapseHeader} onClick={onToggleCollapse}>
        <div style={styles.collapseHeaderLeft}>
          <span style={styles.collapseIcon}>{isCollapsed ? '▶' : '▼'}</span>
          <span style={styles.statusIcon}>{statusIcon}</span>
          {hasQuestions && <span style={styles.questionIcon}>?</span>}
          <h2 style={styles.storyTitle}>{story.name}</h2>
          {isFocused && <span style={styles.focusBadge}>⭐ Focused</span>}
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div style={styles.storyHeader}>
            <div>
              {story.description && (
                <div
                  style={styles.storyDescription}
                  dangerouslySetInnerHTML={{ __html: story.description }}
                />
              )}
              {story.url && (
                <div style={styles.urlContainer}>
                  <a
                    href={story.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.urlLink}
                  >
                    {story.url}
                  </a>
                  <button
                    onClick={onToggleIframe}
                    style={styles.toggleButton}
                  >
                    {showIframe ? 'Hide Preview' : 'Show Preview'}
                  </button>
                </div>
              )}
            </div>
            <div style={styles.storyActions}>
              <button
                onClick={onEditStory}
                style={story.revealed ? styles.disabledButton : styles.secondaryButton}
                disabled={story.revealed}
              >
                Edit Story
              </button>
              {!isFocused && !story.revealed && onFocusStory && (
                <button onClick={onFocusStory} style={styles.secondaryButton}>
                  Focus
                </button>
              )}
              {isFocused && onUnfocusStory && (
                <button onClick={onUnfocusStory} style={styles.secondaryButton}>
                  Unfocus
                </button>
              )}
              {!story.revealed && (
                <button
                  onClick={onRevealVotes}
                  disabled={voteCount === 0}
                  style={styles.primaryButton}
                >
                  Reveal ({voteCount}/{totalUsers})
                </button>
              )}
              {story.revealed && (
                <button onClick={onResetVotes} style={styles.primaryButton}>
                  Reset Votes
                </button>
              )}
            </div>
          </div>

          {story.url && showIframe && (
            <div style={styles.iframeContainer}>
              <iframe
                src={story.url}
                style={styles.iframe}
                title="Story Preview"
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
              />
            </div>
          )}

          <VoteResults
            revealedVotes={revealedVotes}
            average={average}
            darkMode={darkMode}
          />

          <VotingPanel
            fibonacciValues={fibonacciValues}
            selectedVote={selectedVote}
            selectedModifier={selectedModifier}
            isRevealed={story.revealed}
            onVote={onVote}
            onSetModifier={onSetModifier}
            darkMode={darkMode}
          />
        </>
      )}
    </div>
  );
};

const getStyles = (colors: any, isFocused?: boolean, isCollapsed?: boolean): { [key: string]: React.CSSProperties } => ({
  storyCard: {
    backgroundColor: colors.surface,
    borderRadius: '8px',
    padding: isCollapsed ? '12px 16px' : '24px',
    border: isFocused ? `3px solid ${colors.focusBorder}` : `1px solid ${colors.border}`,
    boxShadow: isFocused ? '0 4px 12px rgba(0, 0, 0, 0.15)' : 'none',
  },
  collapseHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    marginBottom: isCollapsed ? '0' : '16px',
    padding: '8px 0',
    userSelect: 'none',
  },
  collapseHeaderLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  collapseIcon: {
    fontSize: '14px',
    color: colors.textSecondary,
    width: '20px',
  },
  statusIcon: {
    fontSize: '18px',
    color: colors.primary,
    width: '20px',
  },
  questionIcon: {
    fontSize: '18px',
    color: '#ff9800',
    width: '20px',
    fontWeight: 'bold',
  },
  storyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  titleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  storyTitle: {
    fontSize: '20px',
    fontWeight: 'bold',
    color: colors.text,
    margin: 0,
  },
  focusBadge: {
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: colors.primary,
    color: 'white',
    padding: '4px 12px',
    borderRadius: '12px',
    display: 'inline-block',
  },
  storyDescription: {
    fontSize: '16px',
    color: colors.textSecondary,
    margin: 0,
  },
  urlContainer: {
    marginTop: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap',
  },
  urlLink: {
    fontSize: '14px',
    color: colors.primary,
    textDecoration: 'none',
    wordBreak: 'break-all',
  },
  toggleButton: {
    padding: '6px 12px',
    fontSize: '12px',
    backgroundColor: colors.textSecondary,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  iframeContainer: {
    marginTop: '16px',
    marginBottom: '16px',
    border: `1px solid ${colors.border}`,
    borderRadius: '4px',
    overflow: 'hidden',
  },
  iframe: {
    width: '100%',
    height: '500px',
    border: 'none',
  },
  storyActions: {
    display: 'flex',
    gap: '12px',
  },
  primaryButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: colors.surface,
    color: colors.primary,
    border: `2px solid ${colors.primary}`,
    borderRadius: '4px',
    cursor: 'pointer',
  },
  disabledButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: colors.surface,
    color: colors.textSecondary,
    border: `2px solid ${colors.border}`,
    borderRadius: '4px',
    cursor: 'not-allowed',
    opacity: 0.5,
  },
});
