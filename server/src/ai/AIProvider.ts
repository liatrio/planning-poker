export interface StoryAnalysisRequest {
  storyName: string;
  description: string;
  averageVotes: number;
  rules?: string; // Optional custom rules/guidelines for analysis
}

export interface StoryAnalysisResponse {
  shouldBreakdown: boolean;
  recommendation?: string;
  suggestedStories?: string[];
}

export interface AIProvider {
  /**
   * Analyzes a story and determines if it should be broken down into smaller tasks
   */
  analyzeStory(request: StoryAnalysisRequest): Promise<StoryAnalysisResponse>;
}
