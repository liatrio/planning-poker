import { AIProvider, StoryAnalysisRequest, StoryAnalysisResponse } from './AIProvider';

/**
 * No-op AI provider that always returns no recommendation.
 * Use this when AI features are disabled.
 */
export class NoOpProvider implements AIProvider {
  async analyzeStory(request: StoryAnalysisRequest): Promise<StoryAnalysisResponse> {
    return {
      shouldBreakdown: false,
    };
  }
}
