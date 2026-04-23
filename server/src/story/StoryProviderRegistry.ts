import { StoryProvider } from './StoryProvider';

export class StoryProviderRegistry {
  private readonly providers: StoryProvider[];

  constructor(providers: StoryProvider[]) {
    this.providers = providers;
  }

  /** Returns the first configured provider whose matcher claims the URL. */
  forUrl(url: string): StoryProvider | null {
    for (const p of this.providers) {
      if (p.isConfigured() && p.matchesUrl(url)) {
        return p;
      }
    }
    return null;
  }

  /** True if any configured provider recognizes the URL. */
  hasProviderFor(url: string): boolean {
    return this.forUrl(url) !== null;
  }
}
