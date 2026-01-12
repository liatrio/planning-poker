import { VoteResults } from './VoteResults';
import { VotingPanel } from './VotingPanel';

interface Story {
  id: string;
  name: string;
  description?: string;
  url?: string;
  revealed: boolean;
  votes: Array<{ userId: string; hasVoted: boolean; value?: string }>;
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
  showIframe: boolean;
  revealedVotes: RevealedVote[] | null;
  average: string | null;
  voteCount: number;
  totalUsers: number;
  darkMode: boolean;
  onEditStory: () => void;
  onNewStory: () => void;
  onRevealVotes: () => void;
  onResetVotes: () => void;
  onToggleIframe: () => void;
  onVote: (value: string, event?: React.MouseEvent<HTMLButtonElement>) => void;
}

export const StoryCard = ({
  story,
  fibonacciValues,
  selectedVote,
  showIframe,
  revealedVotes,
  average,
  voteCount,
  totalUsers,
  darkMode,
  onEditStory,
  onNewStory,
  onRevealVotes,
  onResetVotes,
  onToggleIframe,
  onVote,
}: StoryCardProps) => {
  const colors = darkMode ? {
    surface: '#2d2d2d',
    text: '#e0e0e0',
    textSecondary: '#b0b0b0',
    border: '#404040',
    primary: '#4a9eff',
  } : {
    surface: '#ffffff',
    text: '#333',
    textSecondary: '#666',
    border: '#e0e0e0',
    primary: '#007bff',
  };

  const styles = getStyles(colors);

  return (
    <div style={styles.storyCard}>
      <div style={styles.storyHeader}>
        <div>
          <h2 style={styles.storyTitle}>{story.name}</h2>
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
          <button onClick={onEditStory} style={styles.secondaryButton}>
            Edit Story
          </button>
          <button onClick={onNewStory} style={styles.secondaryButton}>
            New Story
          </button>
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
        isRevealed={story.revealed}
        onVote={onVote}
        darkMode={darkMode}
      />
    </div>
  );
};

const getStyles = (colors: any): { [key: string]: React.CSSProperties } => ({
  storyCard: {
    backgroundColor: colors.surface,
    borderRadius: '8px',
    padding: '24px',
  },
  storyHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '24px',
    flexWrap: 'wrap',
    gap: '16px',
  },
  storyTitle: {
    fontSize: '24px',
    fontWeight: 'bold',
    marginBottom: '8px',
    color: colors.text,
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
});
