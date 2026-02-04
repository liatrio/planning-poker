import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ServerMessage,
  ClientMessage,
  MessageType,
  User,
  Vote,
  Story,
} from './types';

interface AIRecommendation {
  shouldBreakdown: boolean;
  recommendation?: string;
  suggestedStories?: string[];
}

interface UseWebSocketReturn {
  connected: boolean;
  users: User[];
  stories: Story[];
  currentUserId: string | null;
  sendMessage: (message: ClientMessage) => void;
  revealedVotesMap: Map<string, Array<{ userId: string; userName: string; value: string | null }>>;
  aiRecommendationsMap: Map<string, AIRecommendation>;
  aiLoadingMap: Map<string, boolean>;
  hasMorePastStories: boolean;
  totalPastStoriesCount: number;
  loadingMoreStories: boolean;
  loadMorePastStories: () => void;
  error: string | null;
}

export const useWebSocket = (
  sessionId: string | null,
  userName: string | null
): UseWebSocketReturn => {
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [stories, setStories] = useState<Story[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [revealedVotesMap, setRevealedVotesMap] = useState<Map<string, Array<{ userId: string; userName: string; value: string | null }>>>(new Map());
  const [aiRecommendationsMap, setAiRecommendationsMap] = useState<Map<string, AIRecommendation>>(new Map());
  const [aiLoadingMap, setAiLoadingMap] = useState<Map<string, boolean>>(new Map());
  const [hasMorePastStories, setHasMorePastStories] = useState(false);
  const [totalPastStoriesCount, setTotalPastStoriesCount] = useState(0);
  const [loadingMoreStories, setLoadingMoreStories] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!sessionId || !userName) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    let pingInterval: number;

    ws.current = new WebSocket(wsUrl);

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
      setError(null);

      const role = localStorage.getItem('planning_poker_user_role') || 'participant';
      const joinMessage: ClientMessage = {
        type: MessageType.JOIN,
        sessionId,
        userName,
        role,
      };
      ws.current?.send(JSON.stringify(joinMessage));

      // Send keep-alive ping every 30 seconds
      pingInterval = window.setInterval(() => {
        if (ws.current?.readyState === WebSocket.OPEN) {
          try {
            // Send a ping by sending empty string (server will ignore it gracefully)
            ws.current.send('');
          } catch (error) {
            console.error('Error sending keep-alive:', error);
          }
        }
      }, 30000);
    };

    ws.current.onmessage = (event) => {
      try {
        // Ignore empty messages (keep-alive responses)
        if (!event.data || event.data === '') return;

        const message: ServerMessage = JSON.parse(event.data);

        switch (message.type) {
          case MessageType.SESSION_STATE:
            setUsers(message.users);
            setStories(message.stories);
            const currentUser = message.users.find(u => u.name === userName);
            if (currentUser) {
              setCurrentUserId(currentUser.id);
            }
            // Load AI recommendations from session state
            setAiRecommendationsMap((prev) => {
              const newMap = new Map(prev);
              message.stories.forEach(story => {
                if (story.aiRecommendation) {
                  newMap.set(story.id, story.aiRecommendation);
                }
              });
              return newMap;
            });
            setError(null);
            break;

          case MessageType.USER_JOINED:
            setUsers((prev) => [...prev, message.user]);
            break;

          case MessageType.USER_LEFT:
            setUsers((prev) => prev.filter((u) => u.id !== message.userId));
            // Don't remove votes - they're persisted in the database
            // and will be restored when the user reconnects
            break;

          case MessageType.STORY_CREATED:
            setStories((prev) => {
              // If this story is focused, unfocus others
              if (message.story.isFocused) {
                return [
                  { ...message.story, votes: [] },
                  ...prev.map(s => ({ ...s, isFocused: false })),
                ];
              }
              return [{ ...message.story, votes: [] }, ...prev];
            });
            break;

          case MessageType.STORY_UPDATED:
            setStories((prev) => prev.map(story =>
              story.id === message.story.id
                ? { ...story, ...message.story }
                : story
            ));
            // Clear AI recommendation when story is updated
            setAiRecommendationsMap((prev) => {
              const newMap = new Map(prev);
              newMap.delete(message.story.id);
              return newMap;
            });
            break;

          case MessageType.STORY_DELETED:
            setStories((prev) => prev.filter((s) => s.id !== message.storyId));
            // Clean up maps
            setRevealedVotesMap((prev) => {
              const newMap = new Map(prev);
              newMap.delete(message.storyId);
              return newMap;
            });
            setAiRecommendationsMap((prev) => {
              const newMap = new Map(prev);
              newMap.delete(message.storyId);
              return newMap;
            });
            setAiLoadingMap((prev) => {
              const newMap = new Map(prev);
              newMap.delete(message.storyId);
              return newMap;
            });
            break;

          case MessageType.VOTE_UPDATE:
            setStories((prev) => prev.map(story => {
              if (story.id !== message.storyId) return story;

              const existingVoteIndex = story.votes.findIndex(
                (v) => v.userId === message.userId
              );

              const newVotes = [...story.votes];
              const voteData: Vote = {
                userId: message.userId,
                hasVoted: message.hasVoted,
                value: message.value,
                modifier: message.modifier,
              };

              if (existingVoteIndex >= 0) {
                newVotes[existingVoteIndex] = voteData;
              } else {
                newVotes.push(voteData);
              }

              return { ...story, votes: newVotes };
            }));
            break;

          case MessageType.VOTES_REVEALED:
            setRevealedVotesMap((prev) => {
              const newMap = new Map(prev);
              newMap.set(message.storyId, message.votes);
              return newMap;
            });
            setStories((prev) => prev.map(story => {
              if (story.id !== message.storyId) return story;

              // Update votes with revealed values
              const updatedVotes = story.votes.map(vote => {
                const revealedVote = message.votes.find(v => v.userId === vote.userId);
                return {
                  ...vote,
                  hasVoted: true,
                  value: revealedVote?.value ?? undefined,
                };
              });

              return {
                ...story,
                revealed: true,
                votes: updatedVotes,
              };
            }));
            break;

          case MessageType.VOTES_RESET:
            setRevealedVotesMap((prev) => {
              const newMap = new Map(prev);
              newMap.delete(message.storyId);
              return newMap;
            });
            // Clear AI recommendation when votes are reset
            setAiRecommendationsMap((prev) => {
              const newMap = new Map(prev);
              newMap.delete(message.storyId);
              return newMap;
            });
            setStories((prev) => prev.map(story =>
              story.id === message.storyId
                ? { ...story, votes: [], revealed: false }
                : story
            ));
            break;

          case MessageType.STORY_FOCUSED:
            setStories((prev) => prev.map(story => ({
              ...story,
              isFocused: story.id === message.storyId,
            })));
            break;

          case MessageType.STORY_UNFOCUSED:
            setStories((prev) => prev.map(story => ({
              ...story,
              isFocused: false,
            })));
            break;

          case MessageType.AI_ANALYSIS_STARTED:
            setAiLoadingMap((prev) => {
              const newMap = new Map(prev);
              newMap.set(message.storyId, true);
              return newMap;
            });
            console.log('AI analysis started for story:', message.storyId);
            break;

          case MessageType.AI_RECOMMENDATION:
            setAiLoadingMap((prev) => {
              const newMap = new Map(prev);
              newMap.delete(message.storyId);
              return newMap;
            });
            setAiRecommendationsMap((prev) => {
              const newMap = new Map(prev);
              newMap.set(message.storyId, {
                shouldBreakdown: message.shouldBreakdown,
                recommendation: message.recommendation,
                suggestedStories: message.suggestedStories,
              });
              return newMap;
            });
            console.log('AI recommendation received for story:', message.storyId);
            break;

          case MessageType.PAST_STORIES_LOADED:
            setStories((prev) => {
              const merged = [...prev];
              message.stories.forEach((newStory) => {
                if (!merged.find((s) => s.id === newStory.id)) {
                  merged.push(newStory);
                }
              });
              return merged;
            });
            setHasMorePastStories(message.hasMore);
            setTotalPastStoriesCount(message.totalCount);
            setLoadingMoreStories(false);
            break;

          case MessageType.ERROR:
            console.error('Server error:', message.message);
            setError(message.message);
            break;
        }
      } catch (error) {
        console.error('Error parsing message:', error);
        // Don't set error state for parsing errors to prevent crashes
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      setConnected(false);
      if (pingInterval) {
        clearInterval(pingInterval);
      }
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      // Don't set error state here to prevent crashes
      // Connection errors will be handled by onclose
    };

    return () => {
      if (pingInterval) {
        clearInterval(pingInterval);
      }
      ws.current?.close();
    };
  }, [sessionId, userName]);

  const sendMessage = useCallback((message: ClientMessage) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    }
  }, []);

  const loadMorePastStories = useCallback(() => {
    if (!ws.current || loadingMoreStories) return;
    setLoadingMoreStories(true);

    const currentPastCount = stories.filter((s) => s.revealed && !s.isFocused).length;
    const loadMoreMessage: ClientMessage = {
      type: MessageType.LOAD_MORE_STORIES,
      offset: currentPastCount,
      limit: 25,
    };
    sendMessage(loadMoreMessage);
  }, [loadingMoreStories, stories, sendMessage]);

  return {
    connected,
    users,
    stories,
    currentUserId,
    sendMessage,
    revealedVotesMap,
    aiRecommendationsMap,
    aiLoadingMap,
    hasMorePastStories,
    totalPastStoriesCount,
    loadingMoreStories,
    loadMorePastStories,
    error,
  };
};
