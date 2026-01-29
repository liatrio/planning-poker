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
  StoryFocusedMessage,
  StoryUnfocusedMessage,
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

app.post('/api/session', async (req, res) => {
  try {
    const { sessionId: customSessionId } = req.body;
    const sessionId = await sessionManager.createSession(customSessionId);
    res.json({ sessionId });
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      res.status(409).json({ error: 'Session ID already exists' });
    } else {
      console.error('Error creating session:', error);
      res.status(500).json({ error: 'Failed to create session' });
    }
  }
});

wss.on('connection', (ws: WebSocket) => {
  console.log('New WebSocket connection');

  ws.on('message', async (data: Buffer) => {
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

          const session = await sessionManager.getSession(sessionId);
          if (!session) {
            const error: ErrorMessage = {
              type: MessageType.ERROR,
              message: 'Session not found',
            };
            ws.send(JSON.stringify(error));
            return;
          }

          const user = await sessionManager.addUser(sessionId, userName, ws);
          if (!user) {
            const error: ErrorMessage = {
              type: MessageType.ERROR,
              message: 'Failed to join session',
            };
            ws.send(JSON.stringify(error));
            return;
          }

          userToSession.set(ws, { sessionId, userId: user.id });

          const sessionState = await sessionManager.getSessionState(sessionId);
          if (sessionState) {
            ws.send(JSON.stringify(sessionState));
          }

          const userJoined: UserJoinedMessage = {
            type: MessageType.USER_JOINED,
            user: { id: user.id, name: user.name },
          };
          await sessionManager.broadcast(sessionId, userJoined, user.id);

          console.log(`User ${userName} joined session ${sessionId}`);
          break;
        }

        case MessageType.CREATE_STORY: {
          const sessionInfo = userToSession.get(ws);
          if (!sessionInfo) return;

          const { name, description, url } = message;
          const story = await sessionManager.createStory(sessionInfo.sessionId, name, description, url);

          if (story) {
            const storyCreated: StoryCreatedMessage = {
              type: MessageType.STORY_CREATED,
              story: {
                id: story.id,
                name: story.name,
                description: story.description,
                url: story.url,
                revealed: story.revealed,
                isFocused: false,
              },
            };
            await sessionManager.broadcast(sessionInfo.sessionId, storyCreated);
            console.log(`Story created in session ${sessionInfo.sessionId}: ${name}`);
          }
          break;
        }

        case MessageType.EDIT_STORY: {
          const sessionInfo = userToSession.get(ws);
          if (!sessionInfo) return;

          const { storyId, name, description, url } = message;
          const story = await sessionManager.editStory(sessionInfo.sessionId, storyId, name, description, url);

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
            await sessionManager.broadcast(sessionInfo.sessionId, storyUpdated);
            console.log(`Story ${storyId} updated in session ${sessionInfo.sessionId}`);
          }
          break;
        }

        case MessageType.VOTE: {
          const sessionInfo = userToSession.get(ws);
          if (!sessionInfo) return;

          const { storyId, value, modifier } = message;
          const success = await sessionManager.vote(sessionInfo.sessionId, storyId, sessionInfo.userId, value, modifier);

          if (success) {
            const voteUpdate: VoteUpdateMessage = {
              type: MessageType.VOTE_UPDATE,
              storyId,
              userId: sessionInfo.userId,
              hasVoted: value !== null,
              value: undefined, // Don't reveal value until votes are revealed
              modifier: modifier || undefined, // Send modifier so UI can show indicators (convert null to undefined)
            };
            await sessionManager.broadcast(sessionInfo.sessionId, voteUpdate);
            console.log(`Vote received from user ${sessionInfo.userId} for story ${storyId} with modifier ${modifier || 'none'}`);
          }
          break;
        }

        case MessageType.REVEAL_VOTES: {
          const sessionInfo = userToSession.get(ws);
          if (!sessionInfo) return;

          const { storyId } = message;
          await sessionManager.revealVotes(sessionInfo.sessionId, storyId);

          const storyData = await sessionManager.getStoryWithVotes(sessionInfo.sessionId, storyId);

          if (storyData) {
            const votes = Array.from(storyData.story.votes.entries()).map(([userId, value]) => ({
              userId,
              userName: storyData.userNames.get(userId) || 'Unknown',
              value,
            }));

            const votesRevealed: VotesRevealedMessage = {
              type: MessageType.VOTES_REVEALED,
              storyId,
              votes,
            };
            await sessionManager.broadcast(sessionInfo.sessionId, votesRevealed);
            console.log(`Votes revealed for story ${storyId} in session ${sessionInfo.sessionId}`);
          }
          break;
        }

        case MessageType.RESET_VOTES: {
          const sessionInfo = userToSession.get(ws);
          if (!sessionInfo) return;

          const { storyId } = message;
          await sessionManager.resetVotes(sessionInfo.sessionId, storyId);

          const votesReset: VotesResetMessage = {
            type: MessageType.VOTES_RESET,
            storyId,
          };
          await sessionManager.broadcast(sessionInfo.sessionId, votesReset);
          console.log(`Votes reset for story ${storyId} in session ${sessionInfo.sessionId}`);
          break;
        }

        case MessageType.SET_FOCUSED_STORY: {
          const sessionInfo = userToSession.get(ws);
          if (!sessionInfo) return;

          const { storyId } = message;
          const success = await sessionManager.setFocusedStory(sessionInfo.sessionId, storyId);

          if (success) {
            const storyFocused: StoryFocusedMessage = {
              type: MessageType.STORY_FOCUSED,
              storyId,
            };
            await sessionManager.broadcast(sessionInfo.sessionId, storyFocused);
            console.log(`Story ${storyId} focused in session ${sessionInfo.sessionId}`);
          }
          break;
        }

        case MessageType.UNFOCUS_STORY: {
          const sessionInfo = userToSession.get(ws);
          if (!sessionInfo) return;

          const success = await sessionManager.unfocusAllStories(sessionInfo.sessionId);

          if (success) {
            const storyUnfocused: StoryUnfocusedMessage = {
              type: MessageType.STORY_UNFOCUSED,
            };
            await sessionManager.broadcast(sessionInfo.sessionId, storyUnfocused);
            console.log(`All stories unfocused in session ${sessionInfo.sessionId}`);
          }
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

  ws.on('close', async () => {
    const sessionInfo = userToSession.get(ws);
    if (sessionInfo) {
      const { sessionId, userId } = sessionInfo;
      await sessionManager.removeUser(sessionId, userId);

      const userLeft: UserLeftMessage = {
        type: MessageType.USER_LEFT,
        userId,
      };
      await sessionManager.broadcast(sessionId, userLeft);

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

// Graceful shutdown handlers
process.on('SIGTERM', async () => {
  console.log('SIGTERM signal received: closing HTTP server');
  await sessionManager.disconnect();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server');
  await sessionManager.disconnect();
  server.close(() => {
    console.log('HTTP server closed');
    process.exit(0);
  });
});
