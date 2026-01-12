import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { SessionManager } from './sessionManager';
import {
  ClientMessage,
  MessageType,
  ErrorMessage,
  UserJoinedMessage,
  UserLeftMessage,
  StoryCreatedMessage,
  StoryUpdatedMessage,
  VoteUpdateMessage,
  VotesRevealedMessage,
  VotesResetMessage,
} from './types';

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

const sessionManager = new SessionManager();
const userToSession = new Map<WebSocket, { sessionId: string; userId: string }>();

app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date().toISOString() });
});

app.post('/api/session', (req, res) => {
  const sessionId = sessionManager.createSession();
  res.json({ sessionId });
});

wss.on('connection', (ws: WebSocket) => {
  console.log('New WebSocket connection');

  ws.on('message', (data: Buffer) => {
    try {
      const dataStr = data.toString();

      // Ignore empty keep-alive messages
      if (!dataStr || dataStr.trim() === '') {
        return;
      }

      const message: ClientMessage = JSON.parse(dataStr);

      switch (message.type) {
        case MessageType.JOIN: {
          const { sessionId, userName } = message;

          if (!sessionManager.getSession(sessionId)) {
            const error: ErrorMessage = {
              type: MessageType.ERROR,
              message: 'Session not found',
            };
            ws.send(JSON.stringify(error));
            return;
          }

          const user = sessionManager.addUser(sessionId, userName, ws);
          if (!user) {
            const error: ErrorMessage = {
              type: MessageType.ERROR,
              message: 'Failed to join session',
            };
            ws.send(JSON.stringify(error));
            return;
          }

          userToSession.set(ws, { sessionId, userId: user.id });

          const sessionState = sessionManager.getSessionState(sessionId);
          if (sessionState) {
            ws.send(JSON.stringify(sessionState));
          }

          const userJoined: UserJoinedMessage = {
            type: MessageType.USER_JOINED,
            user: { id: user.id, name: user.name },
          };
          sessionManager.broadcast(sessionId, userJoined, user.id);

          console.log(`User ${userName} joined session ${sessionId}`);
          break;
        }

        case MessageType.CREATE_STORY: {
          const sessionInfo = userToSession.get(ws);
          if (!sessionInfo) return;

          const { name, description, url } = message;
          const story = sessionManager.createStory(sessionInfo.sessionId, name, description, url);

          if (story) {
            const storyCreated: StoryCreatedMessage = {
              type: MessageType.STORY_CREATED,
              story: {
                id: story.id,
                name: story.name,
                description: story.description,
                url: story.url,
                revealed: story.revealed,
              },
            };
            sessionManager.broadcast(sessionInfo.sessionId, storyCreated);
            sessionManager.sendToUser(sessionInfo.sessionId, sessionInfo.userId, storyCreated);
            console.log(`Story created in session ${sessionInfo.sessionId}: ${name}`);
          }
          break;
        }

        case MessageType.EDIT_STORY: {
          const sessionInfo = userToSession.get(ws);
          if (!sessionInfo) return;

          const { name, description, url } = message;
          const story = sessionManager.editStory(sessionInfo.sessionId, name, description, url);

          if (story) {
            const storyUpdated: StoryUpdatedMessage = {
              type: MessageType.STORY_UPDATED,
              story: {
                id: story.id,
                name: story.name,
                description: story.description,
                url: story.url,
                revealed: story.revealed,
              },
            };
            sessionManager.broadcast(sessionInfo.sessionId, storyUpdated);
            sessionManager.sendToUser(sessionInfo.sessionId, sessionInfo.userId, storyUpdated);
            console.log(`Story updated in session ${sessionInfo.sessionId}: ${name}`);
          }
          break;
        }

        case MessageType.VOTE: {
          const sessionInfo = userToSession.get(ws);
          if (!sessionInfo) return;

          const { value } = message;
          const success = sessionManager.vote(sessionInfo.sessionId, sessionInfo.userId, value);

          if (success) {
            const session = sessionManager.getSession(sessionInfo.sessionId);
            const voteUpdate: VoteUpdateMessage = {
              type: MessageType.VOTE_UPDATE,
              userId: sessionInfo.userId,
              hasVoted: value !== null,
              value: session?.currentStory?.revealed ? value ?? undefined : undefined,
            };
            sessionManager.broadcast(sessionInfo.sessionId, voteUpdate);
            sessionManager.sendToUser(sessionInfo.sessionId, sessionInfo.userId, voteUpdate);
            console.log(`Vote received from user ${sessionInfo.userId}`);
          }
          break;
        }

        case MessageType.REVEAL_VOTES: {
          const sessionInfo = userToSession.get(ws);
          if (!sessionInfo) return;

          sessionManager.revealVotes(sessionInfo.sessionId);
          const session = sessionManager.getSession(sessionInfo.sessionId);

          if (session?.currentStory) {
            const votes = Array.from(session.currentStory.votes.entries()).map(
              ([userId, value]) => ({
                userId,
                userName: sessionManager.getUserName(sessionInfo.sessionId, userId) || 'Unknown',
                value,
              })
            );

            const votesRevealed: VotesRevealedMessage = {
              type: MessageType.VOTES_REVEALED,
              votes,
            };
            sessionManager.broadcast(sessionInfo.sessionId, votesRevealed);
            sessionManager.sendToUser(sessionInfo.sessionId, sessionInfo.userId, votesRevealed);
            console.log(`Votes revealed in session ${sessionInfo.sessionId}`);
          }
          break;
        }

        case MessageType.RESET_VOTES: {
          const sessionInfo = userToSession.get(ws);
          if (!sessionInfo) return;

          sessionManager.resetVotes(sessionInfo.sessionId);

          const votesReset: VotesResetMessage = {
            type: MessageType.VOTES_RESET,
          };
          sessionManager.broadcast(sessionInfo.sessionId, votesReset);
          sessionManager.sendToUser(sessionInfo.sessionId, sessionInfo.userId, votesReset);
          console.log(`Votes reset in session ${sessionInfo.sessionId}`);
          break;
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
      const errorMsg: ErrorMessage = {
        type: MessageType.ERROR,
        message: 'Invalid message format',
      };
      ws.send(JSON.stringify(errorMsg));
    }
  });

  ws.on('close', () => {
    const sessionInfo = userToSession.get(ws);
    if (sessionInfo) {
      const { sessionId, userId } = sessionInfo;
      sessionManager.removeUser(sessionId, userId);

      const userLeft: UserLeftMessage = {
        type: MessageType.USER_LEFT,
        userId,
      };
      sessionManager.broadcast(sessionId, userLeft);

      userToSession.delete(ws);
      console.log(`User ${userId} left session ${sessionId}`);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
