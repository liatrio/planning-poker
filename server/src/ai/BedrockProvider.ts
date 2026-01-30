import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';
import { AIProvider, StoryAnalysisRequest, StoryAnalysisResponse } from './AIProvider';

export class BedrockProvider implements AIProvider {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor(region: string, modelId: string = 'anthropic.claude-3-5-sonnet-20241022-v2:0') {
    this.client = new BedrockRuntimeClient({ region });
    this.modelId = modelId;
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
      // Bedrock uses different request formats depending on the model
      // For Claude models on Bedrock:
      const payload = {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      };

      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(payload),
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Parse Claude response from Bedrock
      const content = responseBody.content?.[0]?.text;
      if (!content) {
        throw new Error('No content in Bedrock response');
      }

      // Extract JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
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
      console.error('Error calling AWS Bedrock:', error);
      return {
        shouldBreakdown: false,
      };
    }
  }
}
