import { TipTapRenderer } from './TipTapRenderer';

interface AIRecommendation {
  shouldBreakdown: boolean;
  recommendation?: string;
  suggestedStories?: string[];
}

interface PastStory {
  story: {
    id: string;
    name: string;
    description?: string;
    url?: string;
    revealed: boolean;
  };
  revealedVotes: Array<{ userId: string; userName: string; value: string | null }>;
  average: string | null;
  aiRecommendation: AIRecommendation | null;
}

interface PastStoriesProps {
  pastStories: PastStory[];
  expandedStories: Set<string>;
  onToggleExpanded: (storyId: string) => void;
  darkMode: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  loading: boolean;
  totalCount: number;
}

export const PastStories = ({
  pastStories,
  expandedStories,
  onToggleExpanded,
  darkMode,
  hasMore,
  onLoadMore,
  loading,
  totalCount,
}: PastStoriesProps) => {
  if (pastStories.length === 0) return null;

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

  const styles = getStyles(colors, darkMode);

  return (
    <div style={styles.pastStoriesSection}>
        <h2 style={styles.pastStoriesTitle}>Past Stories</h2>
        {pastStories.map((pastStory) => {
          const isExpanded = expandedStories.has(pastStory.story.id);
          const hasAiRecommendation = pastStory.aiRecommendation?.shouldBreakdown || false;
          return (
            <div key={pastStory.story.id} style={styles.pastStoryCard}>
              <div
                style={styles.pastStoryHeader}
                onClick={() => onToggleExpanded(pastStory.story.id)}
              >
                <div style={styles.pastStoryHeaderContent}>
                  <span style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                  {hasAiRecommendation && <span style={styles.aiIconHeader}>🤖</span>}
                  <h3 style={styles.pastStoryTitle}>{pastStory.story.name}</h3>
                  {pastStory.average && (
                    <span style={styles.pastStoryAverage}>Avg: {pastStory.average}</span>
                  )}
                </div>
              </div>

              {isExpanded && (
                <div style={styles.pastStoryContent}>
                  {pastStory.story.description && (
                    <TipTapRenderer
                      content={pastStory.story.description}
                      darkMode={darkMode}
                      style={styles.pastStoryDescription}
                    />
                  )}
                  {pastStory.story.url && (
                    <a
                      href={pastStory.story.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.urlLink}
                    >
                      {pastStory.story.url}
                    </a>
                  )}

                  {pastStory.revealedVotes.length > 0 && (
                    <div style={styles.pastStoryVotes}>
                      <h4 style={styles.pastStoryVotesTitle}>Votes</h4>
                      <div style={styles.votesGrid}>
                        {pastStory.revealedVotes.map((vote) => (
                          <div key={vote.userId} style={styles.voteResult}>
                            <div style={styles.voteName}>{vote.userName}</div>
                            <div style={styles.voteValue}>{vote.value ?? '-'}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {pastStory.aiRecommendation && pastStory.aiRecommendation.shouldBreakdown && (
                    <div style={styles.aiRecommendation}>
                      <div style={styles.aiRecommendationHeader}>
                        <span style={styles.aiIcon}>🤖</span>
                        <h4 style={styles.aiTitle}>AI Recommendation</h4>
                      </div>
                      <p style={styles.aiText}>{pastStory.aiRecommendation.recommendation}</p>
                      {pastStory.aiRecommendation.suggestedStories && pastStory.aiRecommendation.suggestedStories.length > 0 && (
                        <div style={styles.suggestedStories}>
                          <h5 style={styles.suggestedStoriesTitle}>Suggested breakdown:</h5>
                          <ul style={styles.suggestedStoriesList}>
                            {pastStory.aiRecommendation.suggestedStories.map((suggestedStory, index) => (
                              <li key={index} style={styles.suggestedStoryItem}>
                                {suggestedStory}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {hasMore && (
          <div style={styles.loadMoreContainer}>
            <button onClick={onLoadMore} disabled={loading} style={styles.loadMoreButton}>
              {loading ? 'Loading...' : `Load More (${pastStories.length}/${totalCount})`}
            </button>
          </div>
        )}
      </div>
  );
};

const getStyles = (colors: any, darkMode: boolean): { [key: string]: React.CSSProperties } => ({
  pastStoriesSection: {
    marginTop: '24px',
  },
  pastStoriesTitle: {
    fontSize: '20px',
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: '16px',
  },
  pastStoryCard: {
    backgroundColor: colors.surface,
    borderRadius: '8px',
    marginBottom: '12px',
    border: `1px solid ${colors.border}`,
    overflow: 'hidden',
  },
  pastStoryHeader: {
    padding: '16px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    userSelect: 'none',
  },
  pastStoryHeaderContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  expandIcon: {
    fontSize: '14px',
    color: colors.textSecondary,
    minWidth: '20px',
  },
  aiIconHeader: {
    fontSize: '18px',
    minWidth: '20px',
  },
  pastStoryTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: colors.text,
    margin: 0,
    flex: 1,
  },
  pastStoryAverage: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: colors.primary,
    padding: '4px 12px',
    backgroundColor: darkMode ? 'rgba(74, 158, 255, 0.2)' : '#e7f3ff',
    borderRadius: '4px',
  },
  pastStoryContent: {
    padding: '0 16px 16px 48px',
  },
  pastStoryDescription: {
    fontSize: '14px',
    color: colors.textSecondary,
    marginBottom: '12px',
  },
  urlLink: {
    fontSize: '14px',
    color: colors.primary,
    textDecoration: 'none',
    wordBreak: 'break-all',
  },
  pastStoryVotes: {
    marginTop: '16px',
  },
  pastStoryVotesTitle: {
    fontSize: '16px',
    fontWeight: '600',
    color: colors.text,
    marginBottom: '12px',
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
  loadMoreContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '16px',
  },
  loadMoreButton: {
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '600',
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
});
