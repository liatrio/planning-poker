import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import cors from 'cors';
import { readFileSync } from 'fs';
import { join } from 'path';
import { SessionManager } from './sessionManager';
import { AIProviderFactory } from './ai/AIProviderFactory';
import { JiraClient } from './jira/JiraClient';
import {
  ClientMessage,
  MessageType,
  ErrorMessage,
  UserJoinedMessage,
  UserLeftMessage,
  StoryCreatedMessage,
  StoryUpdatedMessage,
  StoryDeletedMessage,
  RefreshStoryMessage,
  VoteUpdateMessage,
  VotesRevealedMessage,
  VotesResetMessage,
  StoryFocusedMessage,
  StoryUnfocusedMessage,
  RoleChangedMessage,
  AIAnalysisStartedMessage,
  AIRecommendationMessage,
  PastStoriesLoadedMessage,
} from './types';

const app = express();
app.use(cors());
app.use(express.json());

const server = createServer(app);
const wss = new WebSocketServer({ server });

const sessionManager = new SessionManager();
const userToSession = new Map<WebSocket, { sessionId: string; userId: string }>();
const aiProvider = AIProviderFactory.createProvider();
const jiraClient = new JiraClient();

// Load AI rules file if it exists
let aiRules: string | undefined;
try {
  const rulesPath = join(__dirname, '..', 'ai-rules.txt');
  aiRules = readFileSync(rulesPath, 'utf-8');
  console.log('AI rules file loaded successfully');
} catch (error) {
  console.log('No AI rules file found, using default prompts');
}

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
          const { sessionId, userName, role } = message;

          const session = await sessionManager.getSession(sessionId);
          if (!session) {
            const error: ErrorMessage = {
              type: MessageType.ERROR,
              message: 'Session not found',
            };
            ws.send(JSON.stringify(error));
            return;
          }

          const user = await sessionManager.addUser(sessionId, userName, ws, role || 'participant');
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

          const dbUser = await sessionManager.getUser(user.id);
          const userJoined: UserJoinedMessage = {
            type: MessageType.USER_JOINED,
            user: { id: user.id, name: user.name, role: dbUser?.role },
          };
          await sessionManager.broadcast(sessionId, userJoined, user.id);

          console.log(`User ${userName} joined session ${sessionId} as ${role || 'participant'}`);
          break;
        }

        case MessageType.CREATE_STORY: {
          const sessionInfo = userToSession.get(ws);
          if (!sessionInfo) return;

          let { name, description, url } = message;

          // If URL is a Jira URL and Jira is configured, fetch title and description from Jira
          if (url && jiraClient.isConfigured() && jiraClient.isJiraUrl(url)) {
            console.log(`Fetching Jira ticket data for URL: ${url}`);
            const jiraData = await jiraClient.enrichStoryFromJiraUrl(url);

            if (jiraData) {
              name = jiraData.name;
              description = jiraData.description;
              console.log(`Successfully fetched Jira data: "${name}"`);
            } else {
              // Failed to fetch Jira data - return error
              const error: ErrorMessage = {
                type: MessageType.ERROR,
                message: 'Failed to fetch data from Jira URL. Please check the URL and try again.',
              };
              ws.send(JSON.stringify(error));
              console.error('Failed to fetch Jira data for URL:', url);
              return;
            }
          } else if (!name) {
            // No Jira URL and no name provided - return error
            const error: ErrorMessage = {
              type: MessageType.ERROR,
              message: 'Story name is required when not using a Jira URL.',
            };
            ws.send(JSON.stringify(error));
            return;
          }

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

        case MessageType.REFRESH_STORY: {
          const sessionInfo = userToSession.get(ws);
          if (!sessionInfo) return;

          const { storyId } = message;

          // Get the existing story
          const existingStory = await sessionManager.getStory(sessionInfo.sessionId, storyId);

          if (!existingStory || !existingStory.url) {
            const error: ErrorMessage = {
              type: MessageType.ERROR,
              message: 'Story must have a URL to refresh',
            };
            ws.send(JSON.stringify(error));
            break;
          }

          // Fetch updated data from Jira if URL is a Jira URL
          let name = existingStory.name;
          let description = existingStory.description;
          const url = existingStory.url;

          if (jiraClient.isConfigured() && jiraClient.isJiraUrl(url)) {
            console.log(`Refreshing Jira ticket data for URL: ${url}`);
            const jiraData = await jiraClient.enrichStoryFromJiraUrl(url);

            if (jiraData) {
              name = jiraData.name;
              description = jiraData.description;
              console.log(`Successfully refreshed Jira data: "${name}"`);
            }
          }

          // Update the story
          const story = await sessionManager.editStory(
            sessionInfo.sessionId,
            storyId,
            name,
            description,
            url
          );

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
            console.log(`Story ${storyId} refreshed in session ${sessionInfo.sessionId}`);
          }
          break;
        }

        case MessageType.VOTE: {
          const sessionInfo = userToSession.get(ws);
          if (!sessionInfo) return;

          // Check if user is an observer
          const user = await sessionManager.getUser(sessionInfo.userId);
          if (user?.role === 'observer') {
            const error: ErrorMessage = {
              type: MessageType.ERROR,
              message: 'Observers cannot vote',
            };
            ws.send(JSON.stringify(error));
            break;
          }

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
            // Get all users to check their roles
            const session = await sessionManager.getSession(sessionInfo.sessionId);
            const userRoles = new Map<string, string>();
            if (session) {
              for (const userId of session.users.keys()) {
                const user = await sessionManager.getUser(userId);
                if (user) {
                  userRoles.set(userId, user.role);
                }
              }
            }

            // Get raw votes with their modifiers
            const rawVotes = Array.from(storyData.story.votes.entries()).map(([userId, value]) => ({
              userId,
              userName: storyData.userNames.get(userId) || 'Unknown',
              value,
              modifier: storyData.voteModifiers.get(userId) || null,
            }));

            // Filter out observer votes for consensus calculation
            const participantVotes = rawVotes.filter(vote => userRoles.get(vote.userId) !== 'observer');

            // Calculate consensus value (mode - most common vote) from numeric participant votes only
            const numericVotes = participantVotes
              .map(v => v.value ? parseFloat(v.value) : null)
              .filter((v): v is number => v !== null && !isNaN(v));

            let consensus: number | null = null;
            if (numericVotes.length > 0) {
              // Find the mode (most common vote value)
              const voteCounts = new Map<number, number>();
              numericVotes.forEach(vote => {
                voteCounts.set(vote, (voteCounts.get(vote) || 0) + 1);
              });

              // Get the vote value with the highest count
              let maxCount = 0;
              let modeValue: number | null = null;
              voteCounts.forEach((count, value) => {
                if (count > maxCount) {
                  maxCount = count;
                  modeValue = value;
                }
              });

              consensus = modeValue;
            }

            // Apply modifiers to adjust votes
            const adjustedVotes = rawVotes.map(vote => {
              if (vote.value && consensus !== null && !isNaN(parseFloat(vote.value))) {
                const numericValue = parseFloat(vote.value);
                let adjustedValue = numericValue;

                // Apply soft_up: if vote < consensus, adjust up to consensus
                if (vote.modifier === 'soft_up' && numericValue < consensus) {
                  adjustedValue = consensus;
                  console.log(`Applied soft_up to user ${vote.userId}: ${numericValue} -> ${adjustedValue}`);
                }
                // Apply soft_down: if vote > consensus, adjust down to consensus
                else if (vote.modifier === 'soft_down' && numericValue > consensus) {
                  adjustedValue = consensus;
                  console.log(`Applied soft_down to user ${vote.userId}: ${numericValue} -> ${adjustedValue}`);
                }

                return {
                  userId: vote.userId,
                  userName: vote.userName,
                  value: adjustedValue.toString(),
                };
              }

              // Non-numeric votes or no consensus, return as-is
              return {
                userId: vote.userId,
                userName: vote.userName,
                value: vote.value,
              };
            });

            // Calculate average from adjusted numeric votes for AI
            const adjustedNumericVotes = adjustedVotes
              .map(v => v.value ? parseFloat(v.value) : null)
              .filter((v): v is number => v !== null && !isNaN(v));

            let willRunAI = false;
            let adjustedAverage = 0;
            if (adjustedNumericVotes.length > 0) {
              adjustedAverage = adjustedNumericVotes.reduce((sum, v) => sum + v, 0) / adjustedNumericVotes.length;
              willRunAI = adjustedAverage > 1 && !!storyData.story.description;
            }

            // Send AI_ANALYSIS_STARTED first if AI will run
            if (willRunAI) {
              const aiAnalysisStarted: AIAnalysisStartedMessage = {
                type: MessageType.AI_ANALYSIS_STARTED,
                storyId,
              };
              await sessionManager.broadcast(sessionInfo.sessionId, aiAnalysisStarted);
              console.log(`AI analysis started for story ${storyId}`);
            }

            // Then send VOTES_REVEALED with adjusted votes
            const votesRevealed: VotesRevealedMessage = {
              type: MessageType.VOTES_REVEALED,
              storyId,
              votes: adjustedVotes,
            };
            await sessionManager.broadcast(sessionInfo.sessionId, votesRevealed);
            console.log(`Votes revealed for story ${storyId} in session ${sessionInfo.sessionId} (consensus: ${consensus})`);

            // Run AI analysis if conditions are met, using adjusted average
            if (willRunAI && adjustedNumericVotes.length > 0) {
              console.log(`Triggering AI analysis for story ${storyId} (adjusted avg: ${adjustedAverage})`);

              // Run AI analysis in the background (don't await)
              aiProvider.analyzeStory({
                storyName: storyData.story.name,
                description: storyData.story.description!,
                averageVotes: adjustedAverage,
                rules: aiRules,
              }).then(async analysis => {
                // Save to database
                await sessionManager.saveAIRecommendation(
                  storyId,
                  analysis.shouldBreakdown,
                  analysis.recommendation,
                  analysis.suggestedStories
                );

                const aiRecommendation: AIRecommendationMessage = {
                  type: MessageType.AI_RECOMMENDATION,
                  storyId,
                  shouldBreakdown: analysis.shouldBreakdown,
                  recommendation: analysis.recommendation,
                  suggestedStories: analysis.suggestedStories,
                };
                sessionManager.broadcast(sessionInfo.sessionId, aiRecommendation);
                console.log(`AI recommendation sent for story ${storyId}`);
              }).catch(async error => {
                console.error(`Error analyzing story ${storyId}:`, error);
                // On error, still save and send a message to remove loading state
                await sessionManager.saveAIRecommendation(storyId, false);

                const aiRecommendation: AIRecommendationMessage = {
                  type: MessageType.AI_RECOMMENDATION,
                  storyId,
                  shouldBreakdown: false,
                };
                sessionManager.broadcast(sessionInfo.sessionId, aiRecommendation);
              });
            }
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

        case MessageType.CHANGE_ROLE: {
          const sessionInfo = userToSession.get(ws);
          if (!sessionInfo) return;

          const { role } = message;

          // Validate role
          if (role !== 'participant' && role !== 'observer') {
            const error: ErrorMessage = {
              type: MessageType.ERROR,
              message: 'Invalid role. Must be "participant" or "observer"',
            };
            ws.send(JSON.stringify(error));
            break;
          }

          const success = await sessionManager.changeUserRole(sessionInfo.userId, role);

          if (success) {
            const roleChanged: RoleChangedMessage = {
              type: MessageType.ROLE_CHANGED,
              userId: sessionInfo.userId,
              role,
            };
            await sessionManager.broadcast(sessionInfo.sessionId, roleChanged);
            console.log(`User ${sessionInfo.userId} changed role to ${role} in session ${sessionInfo.sessionId}`);
          }
          break;
        }

        case MessageType.DELETE_STORY: {
          const sessionInfo = userToSession.get(ws);
          if (!sessionInfo) return;

          const { storyId } = message;
          const success = await sessionManager.deleteStory(sessionInfo.sessionId, storyId);

          if (success) {
            const storyDeleted: StoryDeletedMessage = {
              type: MessageType.STORY_DELETED,
              storyId,
            };
            await sessionManager.broadcast(sessionInfo.sessionId, storyDeleted);
            console.log(`Story ${storyId} deleted in session ${sessionInfo.sessionId}`);
          } else {
            const error: ErrorMessage = {
              type: MessageType.ERROR,
              message: 'Cannot delete revealed story',
            };
            ws.send(JSON.stringify(error));
          }
          break;
        }

        case MessageType.LOAD_MORE_STORIES: {
          const sessionInfo = userToSession.get(ws);
          if (!sessionInfo) return;

          const { offset = 0, limit = 25 } = message;
          const result = await sessionManager.loadMorePastStories(
            sessionInfo.sessionId,
            offset,
            limit
          );

          const response: PastStoriesLoadedMessage = {
            type: MessageType.PAST_STORIES_LOADED,
            stories: result.stories,
            hasMore: result.hasMore,
            totalCount: result.totalCount,
          };
          ws.send(JSON.stringify(response));
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
