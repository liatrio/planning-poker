import OpenAI from 'openai';
import { AIProvider, StoryAnalysisRequest, StoryAnalysisResponse } from './AIProvider';

export class OpenAIProvider implements AIProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o') {
    this.client = new OpenAI({ apiKey });
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
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 1024,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from OpenAI');
      }

      const result = JSON.parse(content);
      return {
        shouldBreakdown: result.shouldBreakdown || false,
        recommendation: result.recommendation,
        suggestedStories: result.suggestedStories,
      };
    } catch (error) {
      console.error('Error calling OpenAI API:', error);
      return {
        shouldBreakdown: false,
      };
    }
  }
}
