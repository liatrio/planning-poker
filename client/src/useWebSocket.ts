import { useEffect, useRef, useState, useCallback } from 'react';
import {
  ServerMessage,
  ClientMessage,
  MessageType,
  User,
  Vote,
} from './types';

interface Story {
  id: string;
  name: string;
  description?: string;
  url?: string;
  revealed: boolean;
  votes: Vote[];
}

interface UseWebSocketReturn {
  connected: boolean;
  users: User[];
  currentStory: Story | null;
  currentUserId: string | null;
  sendMessage: (message: ClientMessage) => void;
  revealedVotes: Array<{ userId: string; userName: string; value: string | null }> | null;
  error: string | null;
}

export const useWebSocket = (
  sessionId: string | null,
  userName: string | null
): UseWebSocketReturn => {
  const [connected, setConnected] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [revealedVotes, setRevealedVotes] = useState<Array<{ userId: string; userName: string; value: string | null }> | null>(null);
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
            setCurrentStory(message.currentStory);
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
            setCurrentStory((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                votes: prev.votes.filter((v) => v.userId !== message.userId),
              };
            });
            break;

          case MessageType.STORY_CREATED:
            setCurrentStory({
              ...message.story,
              votes: [],
            });
            setRevealedVotes(null);
            break;

          case MessageType.STORY_UPDATED:
            setCurrentStory((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                name: message.story.name,
                description: message.story.description,
                url: message.story.url,
              };
            });
            break;

          case MessageType.VOTE_UPDATE:
            setCurrentStory((prev) => {
              if (!prev) return null;

              const existingVoteIndex = prev.votes.findIndex(
                (v) => v.userId === message.userId
              );

              const newVotes = [...prev.votes];
              const voteData: Vote = {
                userId: message.userId,
                hasVoted: message.hasVoted,
                value: message.value,
              };

              if (existingVoteIndex >= 0) {
                newVotes[existingVoteIndex] = voteData;
              } else {
                newVotes.push(voteData);
              }

              return {
                ...prev,
                votes: newVotes,
              };
            });
            break;

          case MessageType.VOTES_REVEALED:
            setRevealedVotes(message.votes);
            setCurrentStory((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                revealed: true,
              };
            });
            break;

          case MessageType.VOTES_RESET:
            setCurrentStory((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                votes: [],
                revealed: false,
              };
            });
            setRevealedVotes(null);
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
    currentStory,
    currentUserId,
    sendMessage,
    revealedVotes,
    error,
  };
};
