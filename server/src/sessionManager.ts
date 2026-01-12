import { v4 as uuidv4 } from 'uuid';
import { WebSocket } from 'ws';
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
  private sessions: Map<string, Session> = new Map();

  createSession(): string {
    const sessionId = uuidv4();
    this.sessions.set(sessionId, {
      id: sessionId,
      users: new Map(),
      currentStory: null,
      stories: [],
    });
    return sessionId;
  }

  getSession(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId);
  }

  addUser(sessionId: string, userName: string, ws: WebSocket): User | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const userId = uuidv4();
    const user: User = { id: userId, name: userName, ws };
    session.users.set(userId, user);

    return user;
  }

  removeUser(sessionId: string, userId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.users.delete(userId);

    if (session.users.size === 0) {
      this.sessions.delete(sessionId);
    }
  }

  createStory(sessionId: string, name: string, description?: string, url?: string): Story | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const story: Story = {
      id: uuidv4(),
      name,
      description,
      url,
      votes: new Map(),
      revealed: false,
    };

    session.currentStory = story;
    session.stories.push(story);

    return story;
  }

  editStory(sessionId: string, name: string, description?: string, url?: string): Story | null {
    const session = this.sessions.get(sessionId);
    if (!session || !session.currentStory) return null;

    session.currentStory.name = name;
    session.currentStory.description = description;
    session.currentStory.url = url;

    return session.currentStory;
  }

  vote(sessionId: string, userId: string, value: string | null): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.currentStory) return false;

    session.currentStory.votes.set(userId, value);
    return true;
  }

  revealVotes(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.currentStory) return false;

    session.currentStory.revealed = true;
    return true;
  }

  resetVotes(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || !session.currentStory) return false;

    session.currentStory.votes.clear();
    session.currentStory.revealed = false;
    return true;
  }

  broadcast(sessionId: string, message: ServerMessage, excludeUserId?: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const messageStr = JSON.stringify(message);
    session.users.forEach((user) => {
      if (user.id !== excludeUserId && user.ws.readyState === WebSocket.OPEN) {
        user.ws.send(messageStr);
      }
    });
  }

  sendToUser(sessionId: string, userId: string, message: ServerMessage): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const user = session.users.get(userId);
    if (user && user.ws.readyState === WebSocket.OPEN) {
      user.ws.send(JSON.stringify(message));
    }
  }

  getSessionState(sessionId: string): SessionStateMessage | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const users = Array.from(session.users.values()).map((u) => ({
      id: u.id,
      name: u.name,
    }));

    let currentStory = null;
    if (session.currentStory) {
      const votes = Array.from(session.currentStory.votes.entries()).map(
        ([userId, value]) => {
          if (session.currentStory!.revealed) {
            return { userId, hasVoted: true, value: value ?? undefined };
          } else {
            return { userId, hasVoted: value !== null };
          }
        }
      );

      currentStory = {
        id: session.currentStory.id,
        name: session.currentStory.name,
        description: session.currentStory.description,
        url: session.currentStory.url,
        revealed: session.currentStory.revealed,
        votes,
      };
    }

    return {
      type: MessageType.SESSION_STATE,
      users,
      currentStory,
    };
  }

  getUserName(sessionId: string, userId: string): string | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    const user = session.users.get(userId);
    return user ? user.name : null;
  }
}
