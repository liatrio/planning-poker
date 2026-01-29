import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ServerMessage,
  ClientMessage,
  MessageType,
  User,
  Vote,
  Story,
} from './types';

interface UseWebSocketReturn {
  connected: boolean;
  users: User[];
  stories: Story[];
  currentUserId: string | null;
  sendMessage: (message: ClientMessage) => void;
  revealedVotesMap: Map<string, Array<{ userId: string; userName: string; value: string | null }>>;
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

      const joinMessage: ClientMessage = {
        type: MessageType.JOIN,
        sessionId,
        userName,
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

  return {
    connected,
    users,
    stories,
    currentUserId,
    sendMessage,
    revealedVotesMap,
    error,
  };
};
