import { AIProvider } from './AIProvider';
import { NoOpProvider } from './NoOpProvider';

export type AIProviderType = 'anthropic' | 'openai' | 'bedrock' | 'none';

export class AIProviderFactory {
  static createProvider(): AIProvider {
    const providerType = (process.env.AI_PROVIDER || 'none').toLowerCase() as AIProviderType;

    switch (providerType) {
      case 'anthropic': {
        const apiKey = process.env.ANTHROPIC_API_KEY;
        if (!apiKey) {
          console.warn('ANTHROPIC_API_KEY not set, falling back to no-op provider');
          return new NoOpProvider();
        }
        try {
          // Lazy load to avoid requiring the package unless it's actually used
          const { AnthropicProvider } = require('./AnthropicProvider');
          const model = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
          return new AnthropicProvider(apiKey, model);
        } catch (error) {
          console.error('Failed to load AnthropicProvider. Make sure @anthropic-ai/sdk is installed:', error);
          return new NoOpProvider();
        }
      }

      case 'openai': {
        const apiKey = process.env.OPENAI_API_KEY;
        if (!apiKey) {
          console.warn('OPENAI_API_KEY not set, falling back to no-op provider');
          return new NoOpProvider();
        }
        try {
          // Lazy load to avoid requiring the package unless it's actually used
          const { OpenAIProvider } = require('./OpenAIProvider');
          const model = process.env.OPENAI_MODEL || 'gpt-4o';
          return new OpenAIProvider(apiKey, model);
        } catch (error) {
          console.error('Failed to load OpenAIProvider. Make sure openai is installed:', error);
          return new NoOpProvider();
        }
      }

      case 'bedrock': {
        const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
        if (!region) {
          console.warn('AWS_REGION not set, falling back to no-op provider');
          return new NoOpProvider();
        }
        try {
          // Lazy load to avoid requiring the package unless it's actually used
          const { BedrockProvider } = require('./BedrockProvider');
          const modelId = process.env.BEDROCK_MODEL_ID || 'anthropic.claude-3-5-sonnet-20241022-v2:0';
          return new BedrockProvider(region, modelId);
        } catch (error) {
          console.error('Failed to load BedrockProvider. Make sure @aws-sdk/client-bedrock-runtime is installed:', error);
          return new NoOpProvider();
        }
      }

      case 'none':
      default:
        return new NoOpProvider();
    }
  }
}
