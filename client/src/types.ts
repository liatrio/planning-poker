export enum MessageType {
  JOIN = 'join',
  USER_JOINED = 'user_joined',
  USER_LEFT = 'user_left',
  CREATE_STORY = 'create_story',
  STORY_CREATED = 'story_created',
  EDIT_STORY = 'edit_story',
  STORY_UPDATED = 'story_updated',
  VOTE = 'vote',
  VOTE_UPDATE = 'vote_update',
  REVEAL_VOTES = 'reveal_votes',
  VOTES_REVEALED = 'votes_revealed',
  RESET_VOTES = 'reset_votes',
  VOTES_RESET = 'votes_reset',
  SET_FOCUSED_STORY = 'set_focused_story',
  STORY_FOCUSED = 'story_focused',
  UNFOCUS_STORY = 'unfocus_story',
  STORY_UNFOCUSED = 'story_unfocused',
  AI_ANALYSIS_STARTED = 'ai_analysis_started',
  AI_RECOMMENDATION = 'ai_recommendation',
  SESSION_STATE = 'session_state',
  ERROR = 'error'
}

export interface User {
  id: string;
  name: string;
}

export interface Story {
  id: string;
  name: string;
  description?: string;
  url?: string;
  revealed: boolean;
  isFocused?: boolean;
  votes: Vote[];
}

export interface Vote {
  userId: string;
  hasVoted: boolean;
  value?: string;
  modifier?: string; // 'soft_up', 'soft_down', 'question', or null
}

export interface JoinMessage {
  type: MessageType.JOIN;
  sessionId: string;
  userName: string;
}

export interface CreateStoryMessage {
  type: MessageType.CREATE_STORY;
  name?: string;
  description?: string;
  url?: string;
}

export interface EditStoryMessage {
  type: MessageType.EDIT_STORY;
  storyId: string;
  name: string;
  description?: string;
  url?: string;
}

export interface VoteMessage {
  type: MessageType.VOTE;
  storyId: string;
  value: string | null;
  modifier?: string | null;
}

export interface RevealVotesMessage {
  type: MessageType.REVEAL_VOTES;
  storyId: string;
}

export interface ResetVotesMessage {
  type: MessageType.RESET_VOTES;
  storyId: string;
}

export interface SetFocusedStoryMessage {
  type: MessageType.SET_FOCUSED_STORY;
  storyId: string;
}

export interface UnfocusStoryMessage {
  type: MessageType.UNFOCUS_STORY;
}

export type ClientMessage =
  | JoinMessage
  | CreateStoryMessage
  | EditStoryMessage
  | VoteMessage
  | RevealVotesMessage
  | ResetVotesMessage
  | SetFocusedStoryMessage
  | UnfocusStoryMessage;

export interface UserJoinedMessage {
  type: MessageType.USER_JOINED;
  user: User;
}

export interface UserLeftMessage {
  type: MessageType.USER_LEFT;
  userId: string;
}

export interface StoryCreatedMessage {
  type: MessageType.STORY_CREATED;
  story: Story & { isFocused: boolean };
}

export interface StoryUpdatedMessage {
  type: MessageType.STORY_UPDATED;
  story: Story;
}

export interface VoteUpdateMessage {
  type: MessageType.VOTE_UPDATE;
  storyId: string;
  userId: string;
  hasVoted: boolean;
  value?: string;
  modifier?: string;
}

export interface VotesRevealedMessage {
  type: MessageType.VOTES_REVEALED;
  storyId: string;
  votes: Array<{ userId: string; userName: string; value: string | null }>;
}

export interface VotesResetMessage {
  type: MessageType.VOTES_RESET;
  storyId: string;
}

export interface StoryFocusedMessage {
  type: MessageType.STORY_FOCUSED;
  storyId: string;
}

export interface StoryUnfocusedMessage {
  type: MessageType.STORY_UNFOCUSED;
}

export interface AIAnalysisStartedMessage {
  type: MessageType.AI_ANALYSIS_STARTED;
  storyId: string;
}

export interface AIRecommendationMessage {
  type: MessageType.AI_RECOMMENDATION;
  storyId: string;
  shouldBreakdown: boolean;
  recommendation?: string;
  suggestedStories?: string[];
}

export interface SessionStateMessage {
  type: MessageType.SESSION_STATE;
  users: User[];
  stories: Array<{
    id: string;
    name: string;
    description?: string;
    url?: string;
    revealed: boolean;
    isFocused: boolean;
    votes: Vote[];
    aiRecommendation?: {
      shouldBreakdown: boolean;
      recommendation?: string;
      suggestedStories?: string[];
    };
  }>;
}

export interface ErrorMessage {
  type: MessageType.ERROR;
  message: string;
}

export type ServerMessage =
  | UserJoinedMessage
  | UserLeftMessage
  | StoryCreatedMessage
  | StoryUpdatedMessage
  | VoteUpdateMessage
  | VotesRevealedMessage
  | VotesResetMessage
  | StoryFocusedMessage
  | StoryUnfocusedMessage
  | AIAnalysisStartedMessage
  | AIRecommendationMessage
  | SessionStateMessage
  | ErrorMessage;
