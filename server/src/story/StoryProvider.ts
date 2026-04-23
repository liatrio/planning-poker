export interface StoryData {
  name: string;
  description: string;
}

export interface StoryProvider {
  /** Human-readable name for UI (e.g. "Jira", "Azure DevOps"). */
  readonly name: string;

  /** True if credentials/config are present so the provider is usable. */
  isConfigured(): boolean;

  /** True if this provider recognizes the URL. */
  matchesUrl(url: string): boolean;

  /** Fetch the story title and description (as TipTap JSON) from the remote system. */
  enrichStoryFromUrl(url: string): Promise<StoryData | null>;

  /** Write the agreed story points back to the remote system. */
  updateStoryPoints(url: string, storyPoints: string): Promise<boolean>;
}
