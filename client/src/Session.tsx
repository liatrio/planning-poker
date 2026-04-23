import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from './useWebSocket';
import { MessageType } from './types';
import { Notification } from './components/Notification';
import { StoryModal } from './components/StoryModal';
import { NamePromptModal } from './components/NamePromptModal';
import { ParticipantsPanel } from './components/ParticipantsPanel';
import { PastStories } from './components/PastStories';
import { StoryCard } from './components/StoryCard';
import { PublishStoryPointsModal } from './components/PublishStoryPointsModal';
import { detectProviderName } from './providers';
import { ConfirmModal } from './components/ConfirmModal';
import { addToSessionHistory } from './utils/sessionHistory';

const FIBONACCI_VALUES = ['0', '1', '2', '3', '5', '8'];
const STORAGE_KEY_USERNAME = 'planning_poker_username';
const STORAGE_KEY_SESSION = 'planning_poker_last_session';
const STORAGE_KEY_DARK_MODE = 'planning_poker_dark_mode';
const STORAGE_KEY_VOTES_PREFIX = 'planning_poker_votes_';
const STORAGE_KEY_MODIFIERS_PREFIX = 'planning_poker_modifiers_';
const STORAGE_KEY_USER_ROLE = 'planning_poker_user_role';

export const Session = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();

  const [userName, setUserName] = useState<string | null>(() => {
    return localStorage.getItem(STORAGE_KEY_USERNAME);
  });

  const [darkMode, setDarkMode] = useState<boolean>(() => {
    const stored = localStorage.getItem(STORAGE_KEY_DARK_MODE);
    return stored === 'true';
  });

  const [selectedVotesMap, setSelectedVotesMap] = useState<Map<string, string | null>>(new Map());
  const [selectedModifiersMap, setSelectedModifiersMap] = useState<Map<string, string | null>>(new Map());
  const [showNewStory, setShowNewStory] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [showNamePrompt, setShowNamePrompt] = useState(!userName);
  const [notification, setNotification] = useState<string | null>(null);
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());
  const [collapsedStories, setCollapsedStories] = useState<Set<string>>(new Set());
  const [publishingStoryId, setPublishingStoryId] = useState<string | null>(null);
  const [showChangeSessionModal, setShowChangeSessionModal] = useState(false);
  const [deletingStoryId, setDeletingStoryId] = useState<string | null>(null);

  const { connected, users, stories, currentUserId, sendMessage, revealedVotesMap, aiRecommendationsMap, aiLoadingMap, hasMorePastStories, totalPastStoriesCount, loadingMoreStories, loadMorePastStories, error } = useWebSocket(
    sessionId || null,
    userName
  );

  useEffect(() => {
    if (userName) {
      setShowNamePrompt(false);
    }
  }, [userName]);

  useEffect(() => {
    if (error && (error.includes('Session not found') || error.includes('session'))) {
      localStorage.removeItem(STORAGE_KEY_SESSION);
      navigate('/', { replace: true });
    }
  }, [error, navigate]);

  useEffect(() => {
    if (connected && sessionId && userName) {
      localStorage.setItem(STORAGE_KEY_USERNAME, userName);
      localStorage.setItem(STORAGE_KEY_SESSION, sessionId);
      addToSessionHistory(sessionId);
    }
  }, [connected, sessionId, userName]);

  // Sync selected votes with server state and collapse new stories by default
  useEffect(() => {
    const newSelectedVotes = new Map<string, string | null>();
    const storedVotes = getStoredVotes();
    const storedModifiers = getStoredModifiers();

    // Load stored modifiers for all stories
    setSelectedModifiersMap(prev => {
      const newMap = new Map(prev);
      storedModifiers.forEach((modifier, storyId) => {
        if (!newMap.has(storyId)) {
          newMap.set(storyId, modifier);
        }
      });
      return newMap;
    });

    stories.forEach(story => {
      const myVote = story.votes.find(v => v.userId === currentUserId);

      if (myVote) {
        // If votes are revealed and we have a value, show it
        if (story.revealed && myVote.value !== undefined) {
          newSelectedVotes.set(story.id, myVote.value);
        }
        // If we've voted but votes not revealed, use stored vote or keep current selection
        else if (myVote.hasVoted) {
          const storedVote = storedVotes.get(story.id);
          const currentSelection = selectedVotesMap.get(story.id);
          if (storedVote !== undefined) {
            newSelectedVotes.set(story.id, storedVote);
          } else if (currentSelection !== undefined) {
            newSelectedVotes.set(story.id, currentSelection);
          }
        }
      }
      // If votes reset (no votes and not revealed), clear selection
      if (story.votes.length === 0 && !story.revealed) {
        newSelectedVotes.delete(story.id);
      }
    });

    setSelectedVotesMap(newSelectedVotes);
  }, [stories, currentUserId]);

  // Auto-collapse pending stories (not revealed and not focused) when joining/rejoining
  useEffect(() => {
    setCollapsedStories(prev => {
      const newSet = new Set(prev);
      stories.forEach(story => {
        // Collapse pending stories (not revealed and not focused)
        if (!story.revealed && !story.isFocused) {
          newSet.add(story.id);
        }
        // Ensure focused stories are never collapsed
        if (story.isFocused) {
          newSet.delete(story.id);
        }
      });
      return newSet;
    });
  }, [stories]);

  // Helper functions for localStorage vote persistence
  const getStoredVotes = (): Map<string, string> => {
    if (!sessionId) return new Map();
    try {
      const stored = localStorage.getItem(STORAGE_KEY_VOTES_PREFIX + sessionId);
      if (stored) {
        const obj = JSON.parse(stored);
        return new Map(Object.entries(obj));
      }
    } catch (e) {
      console.error('Failed to load stored votes:', e);
    }
    return new Map();
  };

  const saveVotesToStorage = (votes: Map<string, string | null>) => {
    if (!sessionId) return;
    try {
      const obj: Record<string, string> = {};
      votes.forEach((value, key) => {
        if (value !== null) {
          obj[key] = value;
        }
      });
      localStorage.setItem(STORAGE_KEY_VOTES_PREFIX + sessionId, JSON.stringify(obj));
    } catch (e) {
      console.error('Failed to save votes:', e);
    }
  };

  const getStoredModifiers = (): Map<string, string> => {
    if (!sessionId) return new Map();
    try {
      const stored = localStorage.getItem(STORAGE_KEY_MODIFIERS_PREFIX + sessionId);
      if (stored) {
        const obj = JSON.parse(stored);
        return new Map(Object.entries(obj));
      }
    } catch (e) {
      console.error('Failed to load stored modifiers:', e);
    }
    return new Map();
  };

  const saveModifiersToStorage = (modifiers: Map<string, string | null>) => {
    if (!sessionId) return;
    try {
      const obj: Record<string, string> = {};
      modifiers.forEach((value, key) => {
        if (value !== null) {
          obj[key] = value;
        }
      });
      localStorage.setItem(STORAGE_KEY_MODIFIERS_PREFIX + sessionId, JSON.stringify(obj));
    } catch (e) {
      console.error('Failed to save modifiers:', e);
    }
  };

  const joinWithName = (name: string, role: string = 'participant') => {
    if (!name.trim()) {
      setNotification('Please enter your name');
      return;
    }

    localStorage.setItem(STORAGE_KEY_USERNAME, name);
    localStorage.setItem(STORAGE_KEY_USER_ROLE, role);
    setUserName(name);
    setShowNamePrompt(false);
  };

  const vote = (storyId: string, value: string, event?: React.MouseEvent<HTMLButtonElement>) => {
    const story = stories.find(s => s.id === storyId);
    if (story?.revealed) return;

    // Remove focus from button to prevent persistent focus outline
    if (event?.currentTarget) {
      event.currentTarget.blur();
    }

    const currentVote = selectedVotesMap.get(storyId);
    const voteValue = currentVote === value ? null : value;
    const modifier = selectedModifiersMap.get(storyId);

    setSelectedVotesMap(prev => {
      const newMap = new Map(prev);
      if (voteValue === null) {
        newMap.delete(storyId);
      } else {
        newMap.set(storyId, voteValue);
      }
      // Save to localStorage
      saveVotesToStorage(newMap);
      return newMap;
    });

    sendMessage({
      type: MessageType.VOTE,
      storyId,
      value: voteValue,
      modifier: voteValue === null ? null : modifier,
    });
  };

  const setModifier = (storyId: string, modifier: string | null) => {
    const story = stories.find(s => s.id === storyId);
    if (story?.revealed) return;

    // Calculate the final modifier value before state update
    const currentModifier = selectedModifiersMap.get(storyId);
    let finalModifier: string | null = null;

    if (modifier === null) {
      finalModifier = null;
    } else {
      // Toggle off if clicking the same modifier
      if (currentModifier === modifier) {
        finalModifier = null;
      } else {
        finalModifier = modifier;
      }
    }

    setSelectedModifiersMap(prev => {
      const newMap = new Map(prev);
      if (finalModifier === null) {
        newMap.delete(storyId);
      } else {
        newMap.set(storyId, finalModifier);
      }
      // Save to localStorage
      saveModifiersToStorage(newMap);
      return newMap;
    });

    // If user has already voted, re-send the vote with the updated modifier
    const currentVote = selectedVotesMap.get(storyId);
    if (currentVote) {
      sendMessage({
        type: MessageType.VOTE,
        storyId,
        value: currentVote,
        modifier: finalModifier,
      });
    }
  };

  const revealVotes = (storyId: string) => {
    sendMessage({
      type: MessageType.REVEAL_VOTES,
      storyId,
    });
  };

  const resetVotes = (storyId: string) => {
    sendMessage({
      type: MessageType.RESET_VOTES,
      storyId,
    });
  };

  const setFocusedStory = (storyId: string) => {
    sendMessage({
      type: MessageType.SET_FOCUSED_STORY,
      storyId,
    });
  };

  const unfocusStory = () => {
    sendMessage({
      type: MessageType.UNFOCUS_STORY,
    });
  };

  const deleteStory = (storyId: string) => {
    const story = stories.find(s => s.id === storyId);
    if (story?.revealed) {
      setNotification('Cannot delete revealed story');
      return;
    }

    setDeletingStoryId(storyId);
  };

  const handleDeleteStoryConfirm = () => {
    if (!deletingStoryId) return;

    sendMessage({
      type: MessageType.DELETE_STORY,
      storyId: deletingStoryId,
    });

    // Clean up localStorage
    setSelectedVotesMap(prev => {
      const newMap = new Map(prev);
      newMap.delete(deletingStoryId);
      saveVotesToStorage(newMap);
      return newMap;
    });

    setSelectedModifiersMap(prev => {
      const newMap = new Map(prev);
      newMap.delete(deletingStoryId);
      saveModifiersToStorage(newMap);
      return newMap;
    });

    setDeletingStoryId(null);
  };

  const refreshStory = (storyId: string) => {
    const story = stories.find(s => s.id === storyId);
    if (!story?.url) {
      setNotification('Story must have a URL to refresh');
      return;
    }

    sendMessage({
      type: MessageType.REFRESH_STORY,
      storyId,
    });
    setNotification(`Refreshing story from ${detectProviderName(story.url)}...`);
  };

  const openPublishModal = (storyId: string) => {
    const story = stories.find(s => s.id === storyId);
    if (!story?.url) {
      setNotification('Story must have a URL to publish story points');
      return;
    }
    if (!story.revealed) {
      setNotification('Story must be revealed before publishing story points');
      return;
    }
    setPublishingStoryId(storyId);
  };

  const publishStoryPoints = (storyPoints: string) => {
    if (!publishingStoryId) return;

    const story = stories.find(s => s.id === publishingStoryId);
    sendMessage({
      type: MessageType.PUBLISH_STORY_POINTS,
      storyId: publishingStoryId,
      storyPoints,
    });
    setNotification(`Publishing to ${detectProviderName(story?.url)}...`);
  };

  const copySessionLink = () => {
    const link = window.location.href.split('?')[0];
    navigator.clipboard.writeText(link);
    setNotification('Session link copied to clipboard!');
  };

  const copySessionId = () => {
    if (sessionId) {
      navigator.clipboard.writeText(sessionId);
      setNotification('Session ID copied to clipboard!');
    }
  };

  const changeSession = () => {
    setShowChangeSessionModal(true);
  };

  const handleChangeSessionConfirm = () => {
    localStorage.removeItem(STORAGE_KEY_SESSION);
    navigate('/', { replace: true });
  };

  const getVoteCount = (story: typeof stories[0]) => {
    return story.votes.filter(v => v.hasVoted).length;
  };

  const getParticipantCount = () => {
    return users.filter(u => u.role !== 'observer').length;
  };

  const calculateAverage = (storyId: string) => {
    const revealedVotes = revealedVotesMap.get(storyId);
    if (!revealedVotes) return null;

    const numericVotes = revealedVotes
      .map(v => v.value)
      .filter((v): v is string => v !== null && v !== '?' && !isNaN(Number(v)))
      .map(Number);

    if (numericVotes.length === 0) return null;

    const sum = numericVotes.reduce((a, b) => a + b, 0);
    return (sum / numericVotes.length).toFixed(1);
  };

  const calculateAverageFromVotes = (votes: Array<{ userId: string; userName: string; value: string | null }> | null) => {
    if (!votes) return null;

    const numericVotes = votes
      .map(v => v.value)
      .filter((v): v is string => v !== null && v !== '?' && !isNaN(Number(v)))
      .map(Number);

    if (numericVotes.length === 0) return null;

    const sum = numericVotes.reduce((a, b) => a + b, 0);
    return (sum / numericVotes.length).toFixed(1);
  };

  const toggleStoryExpanded = (storyId: string) => {
    setExpandedStories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(storyId)) {
        newSet.delete(storyId);
      } else {
        newSet.add(storyId);
      }
      return newSet;
    });
  };

  const toggleStoryCollapsed = (storyId: string) => {
    setCollapsedStories(prev => {
      const newSet = new Set(prev);
      if (newSet.has(storyId)) {
        newSet.delete(storyId);
      } else {
        newSet.add(storyId);
      }
      return newSet;
    });
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem(STORAGE_KEY_DARK_MODE, String(newMode));
  };

  const toggleRole = () => {
    const currentUser = users.find(u => u.id === currentUserId);
    if (!currentUser) return;

    const newRole = currentUser.role === 'observer' ? 'participant' : 'observer';
    sendMessage({
      type: MessageType.CHANGE_ROLE,
      role: newRole,
    });
    setNotification(`Switched to ${newRole} role`);
  };

  const colors = darkMode ? {
    background: '#1a1a1a',
    surface: '#2d2d2d',
    surfaceHover: '#3d3d3d',
    text: '#e0e0e0',
    textSecondary: '#b0b0b0',
    border: '#404040',
    primary: '#4a9eff',
    primaryHover: '#3d8ae0',
  } : {
    background: '#f5f5f5',
    surface: '#ffffff',
    surfaceHover: '#f9f9f9',
    text: '#333',
    textSecondary: '#666',
    border: '#e0e0e0',
    primary: '#007bff',
    primaryHover: '#0056b3',
  };

  const styles = getStyles(colors);

  if (showNamePrompt) {
    return <NamePromptModal isOpen={true} darkMode={darkMode} onSubmit={joinWithName} />;
  }

  if (!connected) {
    return (
      <div style={styles.container}>
        <div style={styles.loading}>Connecting...</div>
      </div>
    );
  }

  // Separate active stories from past stories
  const activeStories = stories.filter(s => !s.revealed || s.isFocused);
  const pastStories = stories.filter(s => s.revealed && !s.isFocused).map(story => ({
    story,
    revealedVotes: revealedVotesMap.get(story.id) || [],
    average: calculateAverageFromVotes(revealedVotesMap.get(story.id) || []),
    aiRecommendation: aiRecommendationsMap.get(story.id) || null,
  }));

  // Sort active stories: focused first, then by creation time (newer first)
  const sortedActiveStories = [...activeStories].sort((a, b) => {
    if (a.isFocused && !b.isFocused) return -1;
    if (!a.isFocused && b.isFocused) return 1;
    return 0; // Keep original order for same focus status
  });

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Planning Poker</h1>
        <div style={styles.headerButtons}>
          <button onClick={toggleDarkMode} style={styles.darkModeButton}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={toggleRole} style={styles.roleButton}>
            {users.find(u => u.id === currentUserId)?.role === 'observer' ? '👤 Join as Participant' : '👁️ Switch to Observer'}
          </button>
          <button onClick={copySessionId} style={styles.copyButton}>
            Copy Session ID
          </button>
          <button onClick={copySessionLink} style={styles.copyButton}>
            Copy Session Link
          </button>
          <button onClick={changeSession} style={styles.copyButton}>
            Change Session
          </button>
        </div>
      </div>

      <div style={styles.content}>
        <ParticipantsPanel
          users={users}
          darkMode={darkMode}
          focusedStoryVotes={stories.find(s => s.isFocused)?.votes}
        />

        <div style={styles.main}>
          <div style={styles.createStorySection}>
            <button onClick={() => setShowNewStory(true)} style={styles.primaryButton}>
              + Create New Story
            </button>
          </div>

          {sortedActiveStories.length === 0 ? (
            <div style={styles.noStory}>
              <h2>No active stories</h2>
              <p>Create a new story to start voting</p>
            </div>
          ) : (
            sortedActiveStories.map(story => (
              <div key={story.id} style={styles.storyContainer}>
                <StoryCard
                  story={story}
                  fibonacciValues={FIBONACCI_VALUES}
                  selectedVote={selectedVotesMap.get(story.id) || null}
                  selectedModifier={selectedModifiersMap.get(story.id) || null}
                  revealedVotes={revealedVotesMap.get(story.id) || null}
                  aiRecommendation={aiRecommendationsMap.get(story.id) || null}
                  aiLoading={aiLoadingMap.get(story.id) || false}
                  average={calculateAverage(story.id)}
                  voteCount={getVoteCount(story)}
                  totalUsers={getParticipantCount()}
                  darkMode={darkMode}
                  isFocused={story.isFocused}
                  isCollapsed={collapsedStories.has(story.id)}
                  currentUserId={currentUserId}
                  isObserver={users.find(u => u.id === currentUserId)?.role === 'observer'}
                  onEditStory={() => setEditingStoryId(story.id)}
                  onRefreshStory={() => refreshStory(story.id)}
                  onPublishStoryPoints={() => openPublishModal(story.id)}
                  onDeleteStory={() => deleteStory(story.id)}
                  onFocusStory={() => setFocusedStory(story.id)}
                  onUnfocusStory={unfocusStory}
                  onRevealVotes={() => revealVotes(story.id)}
                  onResetVotes={() => resetVotes(story.id)}
                  onToggleCollapse={() => toggleStoryCollapsed(story.id)}
                  onVote={(value, event) => vote(story.id, value, event)}
                  onSetModifier={(modifier) => setModifier(story.id, modifier)}
                />
              </div>
            ))
          )}

          <PastStories
            pastStories={pastStories}
            expandedStories={expandedStories}
            onToggleExpanded={toggleStoryExpanded}
            darkMode={darkMode}
            hasMore={hasMorePastStories}
            onLoadMore={loadMorePastStories}
            loading={loadingMoreStories}
            totalCount={totalPastStoriesCount}
          />
        </div>
      </div>

      <StoryModal
        isOpen={showNewStory}
        mode="create"
        darkMode={darkMode}
        onSubmit={(name, description, url) => {
          // Allow empty name if URL is provided (backend will fetch title)
          if (!name.trim() && !url.trim()) {
            setNotification('Please enter a story name or URL');
            return;
          }
          sendMessage({
            type: MessageType.CREATE_STORY,
            name: name.trim() || undefined,
            description: description || undefined,
            url: url || undefined,
          });
          setShowNewStory(false);
        }}
        onCancel={() => setShowNewStory(false)}
      />
      {editingStoryId && (() => {
        const editingStory = stories.find(s => s.id === editingStoryId);
        return (
          <StoryModal
            isOpen={true}
            mode="edit"
            initialName={editingStory?.name || ''}
            initialDescription={editingStory?.description || ''}
            initialUrl={editingStory?.url || ''}
            darkMode={darkMode}
            onSubmit={(name, description, url) => {
              if (!name.trim()) {
                setNotification('Please enter a story name');
                return;
              }
              sendMessage({
                type: MessageType.EDIT_STORY,
                storyId: editingStoryId,
                name,
                description: description || undefined,
                url: url || undefined,
              });
              setEditingStoryId(null);
            }}
            onCancel={() => setEditingStoryId(null)}
          />
        );
      })()}
      {publishingStoryId && (() => {
        const publishingStory = stories.find(s => s.id === publishingStoryId);
        const average = calculateAverage(publishingStoryId);
        const suggestedValue = average || '?';
        return (
          <PublishStoryPointsModal
            isOpen={true}
            storyName={publishingStory?.name || ''}
            suggestedValue={suggestedValue}
            providerName={detectProviderName(publishingStory?.url)}
            darkMode={darkMode}
            onPublish={publishStoryPoints}
            onClose={() => setPublishingStoryId(null)}
          />
        );
      })()}
      <ConfirmModal
        isOpen={showChangeSessionModal}
        title="Change Session"
        message="Are you sure you want to leave this session?"
        confirmText="Leave Session"
        cancelText="Stay"
        darkMode={darkMode}
        onConfirm={handleChangeSessionConfirm}
        onCancel={() => setShowChangeSessionModal(false)}
      />
      {deletingStoryId && (() => {
        const deletingStory = stories.find(s => s.id === deletingStoryId);
        return (
          <ConfirmModal
            isOpen={true}
            title="Delete Story"
            message={`Are you sure you want to delete "${deletingStory?.name}"? This action cannot be undone.`}
            confirmText="Delete"
            cancelText="Cancel"
            darkMode={darkMode}
            onConfirm={handleDeleteStoryConfirm}
            onCancel={() => setDeletingStoryId(null)}
          />
        );
      })()}
      {notification && (
        <Notification message={notification} onClose={() => setNotification(null)} />
      )}
      {error && (
        <Notification message={error} onClose={() => {}} />
      )}
    </div>
  );
};

const getStyles = (colors: any): { [key: string]: React.CSSProperties } => ({
  container: {
    minHeight: '100vh',
    backgroundColor: colors.background,
  },
  loading: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '24px',
    color: colors.textSecondary,
  },
  header: {
    backgroundColor: colors.surface,
    borderBottom: `1px solid ${colors.border}`,
    padding: '20px 40px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '24px',
    fontWeight: 'bold',
    margin: 0,
    color: colors.text,
  },
  headerButtons: {
    display: 'flex',
    gap: '12px',
  },
  darkModeButton: {
    padding: '8px 16px',
    fontSize: '18px',
    backgroundColor: colors.surface,
    color: colors.text,
    border: `2px solid ${colors.border}`,
    borderRadius: '4px',
    cursor: 'pointer',
  },
  roleButton: {
    padding: '8px 16px',
    fontSize: '14px',
    backgroundColor: colors.surface,
    color: colors.text,
    border: `2px solid ${colors.border}`,
    borderRadius: '4px',
    cursor: 'pointer',
  },
  copyButton: {
    padding: '8px 16px',
    fontSize: '14px',
    backgroundColor: colors.primary,
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  content: {
    display: 'flex',
    maxWidth: '1400px',
    margin: '0 auto',
    padding: '20px',
    gap: '20px',
  },
  main: {
    flex: 1,
  },
  createStorySection: {
    marginBottom: '20px',
    display: 'flex',
    justifyContent: 'flex-start',
  },
  storyContainer: {
    marginBottom: '20px',
  },
  noStory: {
    backgroundColor: colors.surface,
    borderRadius: '8px',
    padding: '60px 20px',
    textAlign: 'center',
    color: colors.text,
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
});
