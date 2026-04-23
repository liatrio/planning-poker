import { execFile } from 'child_process';
import { AIProvider, StoryAnalysisRequest, StoryAnalysisResponse } from './AIProvider';

export class KiroProvider implements AIProvider {
  constructor(
    private readonly cliPath: string = 'kiro-cli',
    private readonly timeoutMs: number = 60_000,
  ) {}

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
      const stdout = await this.runCli(['chat', '--no-interactive', '--trust-all-tools', prompt]);

      const jsonMatch = stdout.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Could not parse JSON from Kiro CLI response');
      }

      const result = JSON.parse(jsonMatch[0]);
      return {
        shouldBreakdown: result.shouldBreakdown || false,
        recommendation: result.recommendation,
        suggestedStories: result.suggestedStories,
      };
    } catch (error) {
      console.error('Error calling Kiro CLI:', error);
      return { shouldBreakdown: false };
    }
  }

  private runCli(args: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
      execFile(
        this.cliPath,
        args,
        { timeout: this.timeoutMs, maxBuffer: 10 * 1024 * 1024 },
        (error, stdout, stderr) => {
          if (error) {
            reject(new Error(`Kiro CLI failed: ${error.message}${stderr ? ` — ${stderr}` : ''}`));
            return;
          }
          resolve(stdout);
        },
      );
    });
  }
}
