import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from './useWebSocket';
import { MessageType } from './types';
import { Notification } from './components/Notification';
import { StoryModal } from './components/StoryModal';
import { NamePromptModal } from './components/NamePromptModal';
import { ParticipantsPanel } from './components/ParticipantsPanel';
import { PastStories } from './components/PastStories';
import { StoryCard } from './components/StoryCard';

const FIBONACCI_VALUES = ['0', '1', '2', '3', '5', '8', '13', '21', '34', '?'];
const STORAGE_KEY_USERNAME = 'planning_poker_username';
const STORAGE_KEY_SESSION = 'planning_poker_last_session';
const STORAGE_KEY_DARK_MODE = 'planning_poker_dark_mode';

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

  const [selectedVote, setSelectedVote] = useState<string | null>(null);
  const [showNewStory, setShowNewStory] = useState(false);
  const [showEditStory, setShowEditStory] = useState(false);
  const [showNamePrompt, setShowNamePrompt] = useState(!userName);
  const [showIframe, setShowIframe] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [pastStories, setPastStories] = useState<Array<{
    story: any;
    revealedVotes: Array<{ userId: string; userName: string; value: string | null }>;
    average: string | null;
  }>>([]);
  const [expandedStories, setExpandedStories] = useState<Set<string>>(new Set());

  const { connected, users, currentStory, currentUserId, sendMessage, revealedVotes, error } = useWebSocket(
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
    }
  }, [connected, sessionId, userName]);

  // Track story ID to detect story changes
  const prevStoryId = useRef<string | null>(null);

  useEffect(() => {
    if (currentStory) {
      // Clear selection when story changes
      if (prevStoryId.current !== currentStory.id) {
        setSelectedVote(null);
        prevStoryId.current = currentStory.id;
        return;
      }

      // Clear selection if votes are empty and not revealed (new story or reset)
      if (currentStory.votes.length === 0 && !currentStory.revealed) {
        setSelectedVote(null);
        return;
      }

      const myVote = currentStory.votes.find(v => v.userId === currentUserId);
      if (myVote) {
        // Only update selection if we have the actual value (votes revealed) or if we haven't voted
        if (myVote.value !== undefined) {
          setSelectedVote(myVote.value);
        } else if (!myVote.hasVoted) {
          setSelectedVote(null);
        }
        // else keep current selection (voted but not revealed yet)
      } else {
        setSelectedVote(null);
      }
    } else {
      setSelectedVote(null);
      prevStoryId.current = null;
    }
  }, [currentStory, currentUserId]);

  // Use refs to track the previous story and its revealed votes
  const prevStoryRef = useRef<typeof currentStory>(null);
  const prevRevealedVotesRef = useRef<typeof revealedVotes>(null);

  useEffect(() => {
    // When currentStory changes to a new story, save the old one to history
    if (currentStory && prevStoryRef.current && currentStory.id !== prevStoryRef.current.id) {
      const average = calculateAverageFromVotes(prevRevealedVotesRef.current);
      setPastStories(prev => [{
        story: prevStoryRef.current,
        revealedVotes: prevRevealedVotesRef.current || [],
        average,
      }, ...prev]);
    }

    prevStoryRef.current = currentStory;
  }, [currentStory]);

  useEffect(() => {
    prevRevealedVotesRef.current = revealedVotes;
  }, [revealedVotes]);

  const joinWithName = (name: string) => {
    if (!name.trim()) {
      setNotification('Please enter your name');
      return;
    }

    localStorage.setItem(STORAGE_KEY_USERNAME, name);
    setUserName(name);
    setShowNamePrompt(false);
  };

  const vote = (value: string, event?: React.MouseEvent<HTMLButtonElement>) => {
    if (currentStory?.revealed) return;

    // Remove focus from button to prevent persistent focus outline
    if (event?.currentTarget) {
      event.currentTarget.blur();
    }

    const voteValue = selectedVote === value ? null : value;
    setSelectedVote(voteValue);

    sendMessage({
      type: MessageType.VOTE,
      value: voteValue,
    });
  };

  const revealVotes = () => {
    sendMessage({
      type: MessageType.REVEAL_VOTES,
    });
  };

  const resetVotes = () => {
    sendMessage({
      type: MessageType.RESET_VOTES,
    });
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

  const getVoteCount = () => {
    if (!currentStory) return 0;
    return currentStory.votes.filter(v => v.hasVoted).length;
  };

  const calculateAverage = () => {
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

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem(STORAGE_KEY_DARK_MODE, String(newMode));
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Planning Poker</h1>
        <div style={styles.headerButtons}>
          <button onClick={toggleDarkMode} style={styles.darkModeButton}>
            {darkMode ? '☀️' : '🌙'}
          </button>
          <button onClick={copySessionId} style={styles.copyButton}>
            Copy Session ID
          </button>
          <button onClick={copySessionLink} style={styles.copyButton}>
            Copy Session Link
          </button>
        </div>
      </div>

      <div style={styles.content}>
        <ParticipantsPanel users={users} currentStory={currentStory} darkMode={darkMode} />

        <div style={styles.main}>
          {!currentStory ? (
            <div style={styles.noStory}>
              <h2>No active story</h2>
              <p>Create a new story to start voting</p>
              <button onClick={() => setShowNewStory(true)} style={styles.primaryButton}>
                Create Story
              </button>
            </div>
          ) : (
            <StoryCard
              story={currentStory}
              fibonacciValues={FIBONACCI_VALUES}
              selectedVote={selectedVote}
              showIframe={showIframe}
              revealedVotes={revealedVotes}
              average={calculateAverage()}
              voteCount={getVoteCount()}
              totalUsers={users.length}
              darkMode={darkMode}
              onEditStory={() => setShowEditStory(true)}
              onNewStory={() => setShowNewStory(true)}
              onRevealVotes={revealVotes}
              onResetVotes={resetVotes}
              onToggleIframe={() => setShowIframe(!showIframe)}
              onVote={vote}
            />
          )}

          <PastStories
            pastStories={pastStories}
            expandedStories={expandedStories}
            onToggleExpanded={toggleStoryExpanded}
            darkMode={darkMode}
          />
        </div>
      </div>

      <StoryModal
        isOpen={showNewStory}
        mode="create"
        darkMode={darkMode}
        onSubmit={(name, description, url) => {
          if (!name.trim()) {
            setNotification('Please enter a story name');
            return;
          }
          sendMessage({
            type: MessageType.CREATE_STORY,
            name,
            description: description || undefined,
            url: url || undefined,
          });
          setShowNewStory(false);
        }}
        onCancel={() => setShowNewStory(false)}
      />
      <StoryModal
        isOpen={showEditStory}
        mode="edit"
        initialName={currentStory?.name || ''}
        initialDescription={currentStory?.description || ''}
        initialUrl={currentStory?.url || ''}
        darkMode={darkMode}
        onSubmit={(name, description, url) => {
          if (!name.trim()) {
            setNotification('Please enter a story name');
            return;
          }
          sendMessage({
            type: MessageType.EDIT_STORY,
            name,
            description: description || undefined,
            url: url || undefined,
          });
          setShowEditStory(false);
        }}
        onCancel={() => setShowEditStory(false)}
      />
      {notification && (
        <Notification message={notification} onClose={() => setNotification(null)} />
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
