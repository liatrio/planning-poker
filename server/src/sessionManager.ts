import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';
import { PrismaClient } from '@prisma/client';
import {
  Session,
  User,
  Story,
  MessageType,
  ServerMessage,
  SessionStateMessage,
  VoteUpdateMessage,
} from './types';

export class SessionManager {
  private prisma: PrismaClient;
  private activeConnections: Map<string, WebSocket> = new Map(); // userId -> ws

  constructor() {
    this.prisma = new PrismaClient();
  }

  async createSession(customSessionId?: string): Promise<string> {
    const sessionId = customSessionId || uuidv4();

    try {
      await this.prisma.session.create({
        data: {
          id: sessionId,
        },
      });
      return sessionId;
    } catch (error: any) {
      if (error.code === 'P2002') {
        throw new Error('Session ID already exists');
      }
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
      include: {
        users: {
          where: { active: true },
        },
        stories: {
          include: {
            votes: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!session) return undefined;

    // Transform database session to in-memory Session type
    const currentStory = session.stories.find((s: any) => s.isFocused) || null;

    return {
      id: session.id,
      users: new Map(), // Users with WebSockets are tracked separately in activeConnections
      currentStory: currentStory
        ? {
            id: currentStory.id,
            name: currentStory.name,
            description: currentStory.description ?? undefined,
            url: currentStory.url ?? undefined,
            votes: new Map(currentStory.votes.map((v: any) => [v.userId, v.value])),
            revealed: currentStory.revealed,
          }
        : null,
      stories: session.stories.map((s: any) => ({
        id: s.id,
        name: s.name,
        description: s.description ?? undefined,
        url: s.url ?? undefined,
        votes: new Map(s.votes.map((v: any) => [v.userId, v.value])),
        revealed: s.revealed,
      })),
    };
  }

  async addUser(sessionId: string, userName: string, ws: WebSocket): Promise<User | null> {
    // Check if session exists
    const session = await this.prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) return null;

    try {
      // Look for existing user by username in this session
      let dbUser = await this.prisma.user.findUnique({
        where: {
          sessionId_name: {
            sessionId,
            name: userName,
          },
        },
      });

      if (dbUser) {
        // User exists - this is a reconnection
        // Reactivate the user
        dbUser = await this.prisma.user.update({
          where: { id: dbUser.id },
          data: { active: true },
        });
      } else {
        // New user - create in database
        dbUser = await this.prisma.user.create({
          data: {
            name: userName,
            sessionId,
            active: true,
          },
        });
      }

      // Store WebSocket connection in memory
      this.activeConnections.set(dbUser.id, ws);

      return {
        id: dbUser.id,
        name: dbUser.name,
        ws,
      };
    } catch (error: any) {
      console.error('Error adding user:', error);
      return null;
    }
  }

  async removeUser(sessionId: string, userId: string): Promise<void> {
    // Remove from active connections
    this.activeConnections.delete(userId);

    // Mark user as inactive in database (don't delete - preserve votes)
    try {
      await this.prisma.user.update({
        where: { id: userId },
        data: { active: false },
      });
    } catch (error) {
      console.error('Error removing user:', error);
    }
  }

  async createStory(
    sessionId: string,
    name: string,
    description?: string,
    url?: string
  ): Promise<Story | null> {
    try {
      // Create new story without focusing it
      const story = await this.prisma.story.create({
        data: {
          sessionId,
          name,
          description: description || null,
          url: url || null,
          isFocused: false,
          revealed: false,
        },
        include: {
          votes: true,
        },
      });

      return {
        id: story.id,
        name: story.name,
        description: story.description ?? undefined,
        url: story.url ?? undefined,
        votes: new Map(story.votes.map((v: any) => [v.userId, v.value])),
        revealed: story.revealed,
      };
    } catch (error) {
      console.error('Error creating story:', error);
      return null;
    }
  }

  async editStory(
    sessionId: string,
    storyId: string,
    name: string,
    description?: string,
    url?: string
  ): Promise<Story | null> {
    try {
      // Verify story belongs to session
      const story = await this.prisma.story.findFirst({
        where: {
          id: storyId,
          sessionId,
        },
      });

      if (!story) return null;

      // Don't allow editing revealed stories
      if (story.revealed) {
        console.error('Cannot edit revealed story');
        return null;
      }

      // If description changed, delete AI recommendation
      if (story.description !== (description || null)) {
        await this.deleteAIRecommendation(storyId);
      }

      // Update the story
      const updatedStory = await this.prisma.story.update({
        where: { id: storyId },
        data: {
          name,
          description: description || null,
          url: url || null,
        },
        include: {
          votes: true,
        },
      });

      return {
        id: updatedStory.id,
        name: updatedStory.name,
        description: updatedStory.description ?? undefined,
        url: updatedStory.url ?? undefined,
        votes: new Map(updatedStory.votes.map((v: any) => [v.userId, v.value])),
        revealed: updatedStory.revealed,
      };
    } catch (error) {
      console.error('Error editing story:', error);
      return null;
    }
  }

  async vote(sessionId: string, storyId: string, userId: string, value: string | null, modifier?: string | null): Promise<boolean> {
    try {
      // Verify story exists and belongs to session
      const story = await this.prisma.story.findFirst({
        where: {
          id: storyId,
          sessionId,
        },
      });

      if (!story) return false;

      // Don't allow voting on revealed stories
      if (story.revealed) {
        console.error('Cannot vote on revealed story');
        return false;
      }

      // Upsert vote
      await this.prisma.vote.upsert({
        where: {
          userId_storyId: {
            userId,
            storyId,
          },
        },
        create: {
          userId,
          storyId,
          value,
          modifier: modifier || null,
        },
        update: {
          value,
          modifier: modifier || null,
        },
      });

      return true;
    } catch (error) {
      console.error('Error voting:', error);
      return false;
    }
  }

  async revealVotes(sessionId: string, storyId: string): Promise<boolean> {
    try {
      // Verify story exists and belongs to session
      const story = await this.prisma.story.findFirst({
        where: {
          id: storyId,
          sessionId,
        },
      });

      if (!story) return false;

      // Update story to revealed
      await this.prisma.story.update({
        where: { id: storyId },
        data: { revealed: true },
      });

      return true;
    } catch (error) {
      console.error('Error revealing votes:', error);
      return false;
    }
  }

  async resetVotes(sessionId: string, storyId: string): Promise<boolean> {
    try {
      // Verify story exists and belongs to session
      const story = await this.prisma.story.findFirst({
        where: {
          id: storyId,
          sessionId,
        },
      });

      if (!story) return false;

      // Use transaction to delete votes, AI recommendation, and update story
      await this.prisma.$transaction([
        this.prisma.vote.deleteMany({
          where: { storyId },
        }),
        this.prisma.aIRecommendation.deleteMany({
          where: { storyId },
        }),
        this.prisma.story.update({
          where: { id: storyId },
          data: { revealed: false },
        }),
      ]);

      return true;
    } catch (error) {
      console.error('Error resetting votes:', error);
      return false;
    }
  }

  async setFocusedStory(sessionId: string, storyId: string): Promise<boolean> {
    try {
      // Use transaction to ensure only one focused story
      await this.prisma.$transaction(async (tx: any) => {
        // Verify story exists and belongs to session
        const story = await tx.story.findFirst({
          where: {
            id: storyId,
            sessionId,
          },
        });

        if (!story) {
          throw new Error('Story not found');
        }

        // Unfocus all stories in session
        await tx.story.updateMany({
          where: {
            sessionId,
            isFocused: true,
          },
          data: {
            isFocused: false,
          },
        });

        // Focus the specified story
        await tx.story.update({
          where: { id: storyId },
          data: { isFocused: true },
        });
      });

      return true;
    } catch (error) {
      console.error('Error setting focused story:', error);
      return false;
    }
  }

  async unfocusAllStories(sessionId: string): Promise<boolean> {
    try {
      await this.prisma.story.updateMany({
        where: {
          sessionId,
          isFocused: true,
        },
        data: {
          isFocused: false,
        },
      });

      return true;
    } catch (error) {
      console.error('Error unfocusing stories:', error);
      return false;
    }
  }

  async getStoryWithVotes(sessionId: string, storyId: string): Promise<{
    story: Story;
    userNames: Map<string, string>;
    voteModifiers: Map<string, string | null>;
  } | null> {
    try {
      const story = await this.prisma.story.findFirst({
        where: {
          id: storyId,
          sessionId,
        },
        include: {
          votes: {
            include: {
              user: true,
            },
          },
        },
      });

      if (!story) return null;

      const userNames = new Map<string, string>(
        story.votes.map((v: any) => [v.userId, v.user.name])
      );

      const voteModifiers = new Map<string, string | null>(
        story.votes.map((v: any) => [v.userId, v.modifier])
      );

      return {
        story: {
          id: story.id,
          name: story.name,
          description: story.description ?? undefined,
          url: story.url ?? undefined,
          votes: new Map(story.votes.map((v: any) => [v.userId, v.value])),
          revealed: story.revealed,
        },
        userNames,
        voteModifiers,
      };
    } catch (error) {
      console.error('Error getting story with votes:', error);
      return null;
    }
  }

  async broadcast(sessionId: string, message: ServerMessage, excludeUserId?: string): Promise<void> {
    try {
      // Get active users from database
      const users = await this.prisma.user.findMany({
        where: {
          sessionId,
          active: true,
        },
      });

      const messageStr = JSON.stringify(message);

      // Send to each active user's WebSocket connection
      users.forEach((user: any) => {
        if (user.id !== excludeUserId) {
          const ws = this.activeConnections.get(user.id);
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(messageStr);
          }
        }
      });
    } catch (error) {
      console.error('Error broadcasting:', error);
    }
  }

  sendToUser(sessionId: string, userId: string, message: ServerMessage): void {
    const ws = this.activeConnections.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  async getSessionState(sessionId: string): Promise<SessionStateMessage | null> {
    try {
      const session = await this.prisma.session.findUnique({
        where: { id: sessionId },
        include: {
          users: {
            where: { active: true },
          },
          stories: {
            where: {
              OR: [
                { revealed: false },   // All unrevealed stories
                { isFocused: true },   // OR focused stories (even if revealed)
              ],
            },
            include: {
              votes: true,
              aiRecommendation: true,
            },
            orderBy: [
              { isFocused: 'desc' },   // Focused stories first
              { createdAt: 'desc' },   // Then by creation time
            ],
          },
        },
      });

      if (!session) return null;

      const users = session.users.map((u: any) => ({
        id: u.id,
        name: u.name,
      }));

      const stories = session.stories.map((story: any) => {
        const votes = story.votes.map((vote: any) => {
          if (story.revealed) {
            return {
              userId: vote.userId,
              hasVoted: true,
              value: vote.value ?? undefined,
              modifier: vote.modifier ?? undefined,
            };
          } else {
            return {
              userId: vote.userId,
              hasVoted: vote.value !== null,
              modifier: vote.modifier ?? undefined,
            };
          }
        });

        return {
          id: story.id,
          name: story.name,
          description: story.description ?? undefined,
          url: story.url ?? undefined,
          revealed: story.revealed,
          isFocused: story.isFocused,
          votes,
          aiRecommendation: story.aiRecommendation ? {
            shouldBreakdown: story.aiRecommendation.shouldBreakdown,
            recommendation: story.aiRecommendation.recommendation ?? undefined,
            suggestedStories: story.aiRecommendation.suggestedStories ? (story.aiRecommendation.suggestedStories as string[]) : undefined,
          } : undefined,
        };
      });

      return {
        type: MessageType.SESSION_STATE,
        users,
        stories,
      };
    } catch (error) {
      console.error('Error getting session state:', error);
      return null;
    }
  }

  async getUserName(sessionId: string, userId: string): Promise<string | null> {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });

      return user ? user.name : null;
    } catch (error) {
      console.error('Error getting user name:', error);
      return null;
    }
  }

  async saveAIRecommendation(
    storyId: string,
    shouldBreakdown: boolean,
    recommendation?: string,
    suggestedStories?: string[]
  ): Promise<boolean> {
    try {
      await this.prisma.aIRecommendation.upsert({
        where: { storyId },
        create: {
          storyId,
          shouldBreakdown,
          recommendation,
          suggestedStories: suggestedStories || [],
        },
        update: {
          shouldBreakdown,
          recommendation,
          suggestedStories: suggestedStories || [],
        },
      });
      return true;
    } catch (error) {
      console.error('Error saving AI recommendation:', error);
      return false;
    }
  }

  async deleteAIRecommendation(storyId: string): Promise<boolean> {
    try {
      await this.prisma.aIRecommendation.deleteMany({
        where: { storyId },
      });
      return true;
    } catch (error) {
      console.error('Error deleting AI recommendation:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    await this.prisma.$disconnect();
  }
}
