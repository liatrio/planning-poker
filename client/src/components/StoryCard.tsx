import { useState } from 'react';
import { VoteResults } from './VoteResults';
import { VotingPanel } from './VotingPanel';
import { TipTapRenderer } from './TipTapRenderer';

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

interface AIRecommendation {
  shouldBreakdown: boolean;
  recommendation?: string;
  suggestedStories?: string[];
}

interface StoryCardProps {
  story: Story;
  fibonacciValues: string[];
  selectedVote: string | null;
  selectedModifier: string | null;
  revealedVotes: RevealedVote[] | null;
  aiRecommendation: AIRecommendation | null;
  aiLoading: boolean;
  average: string | null;
  voteCount: number;
  totalUsers: number;
  darkMode: boolean;
  isFocused?: boolean;
  isCollapsed?: boolean;
  currentUserId: string | null;
  onEditStory: () => void;
  onRefreshStory?: () => void;
  onDeleteStory?: () => void;
  onFocusStory?: () => void;
  onUnfocusStory?: () => void;
  onRevealVotes: () => void;
  onResetVotes: () => void;
  onToggleCollapse?: () => void;
  onVote: (value: string, event?: React.MouseEvent<HTMLButtonElement>) => void;
  onSetModifier: (modifier: string | null) => void;
}

export const StoryCard = ({
  story,
  fibonacciValues,
  selectedVote,
  selectedModifier,
  revealedVotes,
  aiRecommendation,
  aiLoading,
  average,
  voteCount,
  totalUsers,
  darkMode,
  isFocused,
  isCollapsed,
  currentUserId,
  onEditStory,
  onRefreshStory,
  onDeleteStory,
  onFocusStory,
  onUnfocusStory,
  onRevealVotes,
  onResetVotes,
  onToggleCollapse,
  onVote,
  onSetModifier,
}: StoryCardProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopyUrl = async () => {
    if (story.url) {
      try {
        await navigator.clipboard.writeText(story.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Failed to copy URL:', err);
      }
    }
  };

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

  // Check if AI recommendation exists
  const hasAiRecommendation = aiRecommendation?.shouldBreakdown || false;

  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
      <div style={styles.storyCard}>
        <div style={styles.collapseHeader} onClick={onToggleCollapse}>
        <div style={styles.collapseHeaderLeft}>
          <span style={styles.collapseIcon}>{isCollapsed ? '▶' : '▼'}</span>
          <span style={styles.statusIcon}>{statusIcon}</span>
          {hasQuestions && <span style={styles.questionIcon}>?</span>}
          {hasAiRecommendation && <span style={styles.aiIconHeader}>🤖</span>}
          <h2 style={styles.storyTitle}>{story.name}</h2>
          {isFocused && <span style={styles.focusBadge}>⭐ Focused</span>}
        </div>
      </div>

      {!isCollapsed && (
        <>
          <div style={styles.storyHeader}>
            <div>
              {story.description && (
                <TipTapRenderer
                  content={story.description}
                  darkMode={darkMode}
                  style={styles.storyDescription}
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
                    onClick={handleCopyUrl}
                    style={styles.copyButton}
                    title="Copy URL to clipboard"
                  >
                    {copied ? '✓ Copied' : '📋 Copy'}
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
              {!story.revealed && story.url && onRefreshStory && (
                <button onClick={onRefreshStory} style={styles.secondaryButton}>
                  🔄 Refresh
                </button>
              )}
              {!story.revealed && onDeleteStory && (
                <button onClick={onDeleteStory} style={styles.dangerButton}>
                  Delete
                </button>
              )}
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
                  disabled={voteCount === 0 || !isFocused}
                  style={styles.primaryButton}
                  title={!isFocused ? 'Focus this story to reveal votes' : ''}
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

          {aiLoading ? (
            <div style={styles.aiLoadingContainer}>
              <div style={styles.aiLoadingHeader}>
                <div style={styles.spinner}></div>
                <span style={styles.aiLoadingText}>Votes are being evaluated...</span>
              </div>
            </div>
          ) : (
            <VoteResults
              revealedVotes={revealedVotes}
              average={average}
              darkMode={darkMode}
            />
          )}

          {aiRecommendation && aiRecommendation.shouldBreakdown && (
            <div style={styles.aiRecommendation}>
              <div style={styles.aiRecommendationHeader}>
                <span style={styles.aiIcon}>🤖</span>
                <h4 style={styles.aiTitle}>AI Recommendation</h4>
              </div>
              <p style={styles.aiText}>{aiRecommendation.recommendation}</p>
              {aiRecommendation.suggestedStories && aiRecommendation.suggestedStories.length > 0 && (
                <div style={styles.suggestedStories}>
                  <h5 style={styles.suggestedStoriesTitle}>Suggested breakdown:</h5>
                  <ul style={styles.suggestedStoriesList}>
                    {aiRecommendation.suggestedStories.map((suggestedStory, index) => (
                      <li key={index} style={styles.suggestedStoryItem}>
                        {suggestedStory}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

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
    </>
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
  aiIconHeader: {
    fontSize: '18px',
    width: '20px',
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
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '12px',
  },
  urlLink: {
    fontSize: '14px',
    color: colors.primary,
    textDecoration: 'none',
    wordBreak: 'break-all',
    flex: 1,
  },
  copyButton: {
    padding: '4px 12px',
    fontSize: '12px',
    fontWeight: '600',
    backgroundColor: colors.surface,
    color: colors.primary,
    border: `1px solid ${colors.primary}`,
    borderRadius: '4px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
    transition: 'all 0.2s',
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
  dangerButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: '#dc3545',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  aiLoadingContainer: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: colors.surface,
    border: `2px solid ${colors.primary}`,
    borderRadius: '8px',
  },
  aiLoadingHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  spinner: {
    width: '20px',
    height: '20px',
    border: `3px solid ${colors.border}`,
    borderTop: `3px solid ${colors.primary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  aiLoadingText: {
    fontSize: '14px',
    color: colors.text,
    fontStyle: 'italic',
  },
  aiRecommendation: {
    marginTop: '20px',
    padding: '16px',
    backgroundColor: colors.surface,
    border: `2px solid ${colors.primary}`,
    borderRadius: '8px',
  },
  aiRecommendationHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '12px',
  },
  aiIcon: {
    fontSize: '20px',
  },
  aiTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: colors.text,
    margin: 0,
  },
  aiText: {
    fontSize: '14px',
    color: colors.text,
    lineHeight: '1.5',
    margin: '0 0 12px 0',
  },
  suggestedStories: {
    marginTop: '12px',
  },
  suggestedStoriesTitle: {
    fontSize: '14px',
    fontWeight: '600',
    color: colors.text,
    margin: '0 0 8px 0',
  },
  suggestedStoriesList: {
    margin: '0',
    paddingLeft: '20px',
  },
  suggestedStoryItem: {
    fontSize: '14px',
    color: colors.text,
    lineHeight: '1.8',
  },
});
