# AI Provider Setup

This application supports AI-powered story analysis that can recommend breaking down large stories into smaller tasks.

## Supported Providers

- **Anthropic** (Claude via direct API)
- **OpenAI** (GPT-4)
- **AWS Bedrock** (Claude and other models via AWS)
- **None** (Disabled)

## Configuration

Set the following environment variables in your `.env` file:

### Option 1: Anthropic (Recommended)

```bash
AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=your_api_key_here
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022  # Optional, defaults to this model
```

### Option 2: OpenAI

```bash
AI_PROVIDER=openai
OPENAI_API_KEY=your_api_key_here
OPENAI_MODEL=gpt-4o  # Optional, defaults to gpt-4o
```

### Option 3: AWS Bedrock

```bash
AI_PROVIDER=bedrock
AWS_REGION=us-east-1  # Your AWS region
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0  # Optional
```

**AWS Credentials**: Bedrock uses the AWS SDK which looks for credentials in this order:
1. Environment variables (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`)
2. AWS credentials file (`~/.aws/credentials`)
3. IAM role (if running on EC2, ECS, Lambda, etc.)

Make sure your AWS credentials have permission to invoke Bedrock models.

### Option 4: Disabled (Default)

```bash
AI_PROVIDER=none
```

Or simply don't set `AI_PROVIDER` at all.

## Installation

### For Anthropic

```bash
npm install @anthropic-ai/sdk
```

### For OpenAI

```bash
npm install openai
```

### For AWS Bedrock

```bash
npm install @aws-sdk/client-bedrock-runtime
```

**Note**: You'll also need to configure AWS credentials (see Option 3 above).

## How It Works

When votes are revealed for a story:
1. If the average vote is > 1 story point
2. AND the story has a description filled in
3. The AI will analyze the story and determine if it should be broken down

The AI recommendation will appear on the frontend showing:
- Whether the story should be broken down
- A recommendation explaining why
- Suggested smaller stories to break it into (2-4 suggestions)

## Custom AI Rules

You can customize how the AI analyzes stories by creating or editing the `ai-rules.txt` file in the server directory.

This file contains guidelines that will be sent to the AI with every analysis, allowing you to:
- Define your team's definition of "too large"
- Specify when stories should or shouldn't be broken down
- Guide the AI on your team's preferred story structure
- Add domain-specific context for your project

**Example rules file** (`server/ai-rules.txt`):

```
You are analyzing user stories for a software development team.

TEAM CONVENTIONS:
- We follow the INVEST principles for user stories
- Stories should be completable within a single sprint (2 weeks)
- Database migrations should be separate stories

WHEN TO RECOMMEND BREAKDOWN:
- Story spans multiple microservices
- Story requires changes to more than 3 files
- Story has dependencies that could be parallelized

WHEN NOT TO RECOMMEND BREAKDOWN:
- Story is UI-only with no backend changes
- Breaking down would create too much overhead
```

The rules file is loaded at server startup. If the file doesn't exist, the AI will use default prompts.

**To update rules:** Edit `ai-rules.txt` and restart the server.

## Available Bedrock Models

When using `AI_PROVIDER=bedrock`, you can use any of these models via `BEDROCK_MODEL_ID`:

### Claude Models (Recommended)
- `anthropic.claude-3-5-sonnet-20241022-v2:0` (Latest, default)
- `anthropic.claude-3-5-sonnet-20240620-v1:0`
- `anthropic.claude-3-opus-20240229-v1:0`
- `anthropic.claude-3-sonnet-20240229-v1:0`
- `anthropic.claude-3-haiku-20240307-v1:0`

### Other Models
- `amazon.titan-text-premier-v1:0`
- `ai21.jamba-instruct-v1:0`
- `meta.llama3-1-405b-instruct-v1:0`
- `mistral.mistral-large-2407-v1:0`

Note: Different models may have different pricing and capabilities. Check AWS Bedrock documentation for details.

## Swapping Providers

To switch providers, simply:
1. Install the appropriate SDK (if not already installed)
2. Update the `AI_PROVIDER` environment variable
3. Set the corresponding API key or AWS credentials
4. Restart the server

No code changes required!

## Adding New Providers

To add a new AI provider:

1. Create a new class implementing the `AIProvider` interface in `src/ai/`
2. Add the provider to the `AIProviderFactory` switch statement
3. Update this README with configuration instructions

Example provider interface:

```typescript
interface AIProvider {
  analyzeStory(request: StoryAnalysisRequest): Promise<StoryAnalysisResponse>;
}
```
