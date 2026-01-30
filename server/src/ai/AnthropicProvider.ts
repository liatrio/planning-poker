import Anthropic from '@anthropic-ai/sdk';
import { AIProvider, StoryAnalysisRequest, StoryAnalysisResponse } from './AIProvider';

export class AnthropicProvider implements AIProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
    this.client = new Anthropic({ apiKey });
    this.model = model;
  }

  async analyzeStory(request: StoryAnalysisRequest): Promise<StoryAnalysisResponse> {
    const { storyName, description, averageVotes, rules } = request;

    const rulesSection = rules ? `\n${rules}\n` : '';

    const prompt = `You are a software engineering expert helping a team with story estimation.
${rulesSection}
Story Name: ${storyName}
Description: ${description}
Average Story Points: ${averageVotes}

The team has estimated this story at ${averageVotes} story points. Stories greater than 1 point might benefit from being broken down into smaller, more manageable tasks.

Please analyze this story and determine:
1. Should it be broken down into smaller stories? (yes/no)
2. If yes, provide a brief recommendation explaining why
3. If yes, suggest 2-4 smaller stories that this could be broken into

Respond in JSON format:
{
  "shouldBreakdown": boolean,
  "recommendation": "string (if shouldBreakdown is true)",
  "suggestedStories": ["story1", "story2", ...] (if shouldBreakdown is true)
}`;

    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from AI');
      }

      // Parse JSON response
      const jsonMatch = content.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from AI response');
      }

      const result = JSON.parse(jsonMatch[0]);
      return {
        shouldBreakdown: result.shouldBreakdown || false,
        recommendation: result.recommendation,
        suggestedStories: result.suggestedStories,
      };
    } catch (error) {
      console.error('Error calling Anthropic API:', error);
      return {
        shouldBreakdown: false,
      };
    }
  }
}
