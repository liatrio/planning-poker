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
}

interface PastStoriesProps {
  pastStories: PastStory[];
  expandedStories: Set<string>;
  onToggleExpanded: (storyId: string) => void;
  darkMode: boolean;
}

export const PastStories = ({
  pastStories,
  expandedStories,
  onToggleExpanded,
  darkMode,
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
        return (
          <div key={pastStory.story.id} style={styles.pastStoryCard}>
            <div
              style={styles.pastStoryHeader}
              onClick={() => onToggleExpanded(pastStory.story.id)}
            >
              <div style={styles.pastStoryHeaderContent}>
                <span style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                <h3 style={styles.pastStoryTitle}>{pastStory.story.name}</h3>
                {pastStory.average && (
                  <span style={styles.pastStoryAverage}>Avg: {pastStory.average}</span>
                )}
              </div>
            </div>

            {isExpanded && (
              <div style={styles.pastStoryContent}>
                {pastStory.story.description && (
                  <div
                    style={styles.pastStoryDescription}
                    dangerouslySetInnerHTML={{ __html: pastStory.story.description }}
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
              </div>
            )}
          </div>
        );
      })}
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
});
