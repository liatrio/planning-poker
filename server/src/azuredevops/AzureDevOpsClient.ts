import axios, { AxiosInstance } from 'axios';
import { StoryData, StoryProvider } from '../story/StoryProvider';

interface AzureWorkItem {
  id: number;
  fields: Record<string, any>;
}

// Matches https://dev.azure.com/{org}/{project}/_workitems/edit/{id}
// Project is optional in some links; we fall back to env AZURE_DEVOPS_PROJECT.
const URL_PATTERN = /^https:\/\/dev\.azure\.com\/([^/]+)(?:\/([^/]+))?\/_workitems\/edit\/(\d+)/;

interface ParsedUrl {
  org: string;
  project: string | null;
  id: string;
}

export class AzureDevOpsClient implements StoryProvider {
  readonly name = 'Azure DevOps';
  private client: AxiosInstance | null = null;
  private readonly org: string | null;
  private readonly defaultProject: string | null;

  constructor() {
    const org = process.env.AZURE_DEVOPS_ORG || null;
    const pat = process.env.AZURE_DEVOPS_PAT || null;
    const project = process.env.AZURE_DEVOPS_PROJECT || null;

    this.org = org;
    this.defaultProject = project;

    if (org && pat) {
      this.client = axios.create({
        baseURL: `https://dev.azure.com/${org}`,
        auth: { username: '', password: pat },
        headers: { Accept: 'application/json' },
      });
    }
  }

  isConfigured(): boolean {
    return this.client !== null && this.org !== null;
  }

  matchesUrl(url: string): boolean {
    if (!this.org) return false;
    const parsed = this.parseUrl(url);
    return parsed !== null && parsed.org.toLowerCase() === this.org.toLowerCase();
  }

  async enrichStoryFromUrl(url: string): Promise<StoryData | null> {
    const parsed = this.parseUrl(url);
    if (!parsed) return null;

    const project = parsed.project || this.defaultProject;
    if (!project) {
      console.error('Azure DevOps: project not in URL and AZURE_DEVOPS_PROJECT is unset');
      return null;
    }

    const workItem = await this.fetchWorkItem(project, parsed.id);
    if (!workItem) return null;

    const name = workItem.fields['System.Title'];
    if (!name) {
      console.error('Azure DevOps work item has no System.Title');
      return null;
    }

    const html = workItem.fields['System.Description'] || '';
    const description = html ? this.convertHtmlToTipTap(html) : '';

    return { name, description };
  }

  async updateStoryPoints(url: string, storyPoints: string): Promise<boolean> {
    if (!this.client) {
      console.warn('Azure DevOps client not configured');
      return false;
    }

    const parsed = this.parseUrl(url);
    if (!parsed) {
      console.warn('Invalid Azure DevOps URL');
      return false;
    }

    const project = parsed.project || this.defaultProject;
    if (!project) {
      console.error('Azure DevOps: cannot update points without a project');
      return false;
    }

    const numeric = parseFloat(storyPoints);
    const patch = [
      {
        op: 'add',
        path: '/fields/Microsoft.VSTS.Scheduling.StoryPoints',
        value: isNaN(numeric) ? null : numeric,
      },
    ];

    try {
      await this.client.patch(
        `/${encodeURIComponent(project)}/_apis/wit/workitems/${parsed.id}?api-version=7.0`,
        patch,
        { headers: { 'Content-Type': 'application/json-patch+json' } },
      );
      console.log(`Successfully updated story points for AzDO work item ${parsed.id} to ${storyPoints}`);
      return true;
    } catch (error: any) {
      console.error(
        `Failed to update story points for AzDO work item ${parsed.id}:`,
        error.response?.data ?? error,
      );
      return false;
    }
  }

  private parseUrl(url: string): ParsedUrl | null {
    const match = url.match(URL_PATTERN);
    if (!match) return null;
    return { org: match[1], project: match[2] || null, id: match[3] };
  }

  private async fetchWorkItem(project: string, id: string): Promise<AzureWorkItem | null> {
    if (!this.client) return null;
    try {
      const response = await this.client.get<AzureWorkItem>(
        `/${encodeURIComponent(project)}/_apis/wit/workitems/${id}`,
        { params: { 'api-version': '7.0' } },
      );
      return response.data;
    } catch (error: any) {
      console.error(`Failed to fetch AzDO work item ${id}:`, error.response?.data ?? error);
      return null;
    }
  }

  /**
   * Minimal HTML → TipTap JSON converter. Handles paragraphs, headings, lists,
   * inline marks (bold/italic/strike/code/link), hard breaks, blockquotes, and
   * rules. Unknown elements collapse to their children so content isn't lost.
   */
  private convertHtmlToTipTap(html: string): string {
    const tokens = tokenizeHtml(html);
    const doc = parseTokensToDoc(tokens);
    return JSON.stringify(doc);
  }
}

// --- HTML → TipTap helpers --------------------------------------------------

type Tok =
  | { kind: 'open'; tag: string; attrs: Record<string, string> }
  | { kind: 'close'; tag: string }
  | { kind: 'void'; tag: string; attrs: Record<string, string> }
  | { kind: 'text'; text: string };

function tokenizeHtml(html: string): Tok[] {
  const tokens: Tok[] = [];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][a-zA-Z0-9]*)\s*>|<([a-zA-Z][a-zA-Z0-9]*)([^>]*?)(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    if (m[0].startsWith('<!--')) continue;
    if (m[1]) {
      tokens.push({ kind: 'close', tag: m[1].toLowerCase() });
    } else if (m[2]) {
      const tag = m[2].toLowerCase();
      const attrs = parseAttrs(m[3] || '');
      const selfClose = m[4] === '/' || VOID_ELEMENTS.has(tag);
      tokens.push({ kind: selfClose ? 'void' : 'open', tag, attrs });
    } else if (m[5]) {
      const text = decodeEntities(m[5]);
      if (text.length > 0) tokens.push({ kind: 'text', text });
    }
  }
  return tokens;
}

const VOID_ELEMENTS = new Set(['br', 'hr', 'img', 'input', 'meta', 'link']);

function parseAttrs(raw: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([a-zA-Z_:][\w:.-]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw)) !== null) {
    out[m[1].toLowerCase()] = decodeEntities(m[2] ?? m[3] ?? m[4] ?? '');
  }
  return out;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

const BLOCK_TAGS = new Set([
  'p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'blockquote', 'pre', 'hr',
]);
const INLINE_MARK_TAGS: Record<string, string> = {
  b: 'bold', strong: 'bold',
  i: 'italic', em: 'italic',
  s: 'strike', strike: 'strike', del: 'strike',
  code: 'code',
};

function parseTokensToDoc(tokens: Tok[]): any {
  let i = 0;

  function parseBlocks(stopTags: Set<string>): any[] {
    const out: any[] = [];
    while (i < tokens.length) {
      const tok = tokens[i];
      if (tok.kind === 'close' && stopTags.has(tok.tag)) return out;
      if (tok.kind === 'text') {
        const text = tok.text.trim();
        if (text.length > 0) {
          out.push({ type: 'paragraph', content: [{ type: 'text', text }] });
        }
        i++;
        continue;
      }
      if (tok.kind === 'open' || tok.kind === 'void') {
        const tag = tok.tag;
        if (tag === 'br' || tag === 'hr') {
          i++;
          if (tag === 'hr') out.push({ type: 'horizontalRule' });
          continue;
        }
        if (BLOCK_TAGS.has(tag)) {
          out.push(...parseBlock());
          continue;
        }
        // Inline at block level — wrap in paragraph
        const para = { type: 'paragraph', content: parseInlineRun(stopTags) };
        if (para.content.length > 0) out.push(para);
        continue;
      }
      if (tok.kind === 'close') {
        i++; // stray close
        continue;
      }
    }
    return out;
  }

  function parseBlock(): any[] {
    const tok = tokens[i];
    if (tok.kind !== 'open' && tok.kind !== 'void') {
      i++;
      return [];
    }
    const tag = tok.tag;
    i++; // consume open

    switch (tag) {
      case 'p':
      case 'div': {
        const content = parseInlineRun(new Set([tag]));
        consumeClose(tag);
        return content.length > 0 ? [{ type: 'paragraph', content }] : [];
      }
      case 'h1': case 'h2': case 'h3': case 'h4': case 'h5': case 'h6': {
        const level = parseInt(tag[1], 10);
        const content = parseInlineRun(new Set([tag]));
        consumeClose(tag);
        return [{ type: 'heading', attrs: { level }, content }];
      }
      case 'ul': case 'ol': {
        const listType = tag === 'ul' ? 'bulletList' : 'orderedList';
        const items: any[] = [];
        while (i < tokens.length) {
          const t = tokens[i];
          if (t.kind === 'close' && t.tag === tag) break;
          if (t.kind === 'open' && t.tag === 'li') {
            i++;
            const content = parseBlocks(new Set(['li']));
            consumeClose('li');
            items.push({
              type: 'listItem',
              content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }],
            });
          } else {
            i++; // skip whitespace/text between items
          }
        }
        consumeClose(tag);
        return [{ type: listType, content: items }];
      }
      case 'blockquote': {
        const content = parseBlocks(new Set(['blockquote']));
        consumeClose('blockquote');
        return [{ type: 'blockquote', content }];
      }
      case 'pre': {
        // Treat <pre> content as a code block; flatten inline to text.
        const text = collectText(new Set(['pre']));
        consumeClose('pre');
        return [{
          type: 'codeBlock',
          content: text ? [{ type: 'text', text }] : [],
        }];
      }
      default:
        return [];
    }
  }

  function parseInlineRun(stopTags: Set<string>, marks: any[] = []): any[] {
    const out: any[] = [];
    while (i < tokens.length) {
      const tok = tokens[i];
      if (tok.kind === 'close' && stopTags.has(tok.tag)) return out;
      if (tok.kind === 'close') {
        // Closing tag for something we didn't open here — stop the run so the
        // caller can decide what to do.
        return out;
      }
      if (tok.kind === 'text') {
        if (tok.text.length > 0) {
          out.push({
            type: 'text',
            text: tok.text,
            ...(marks.length > 0 ? { marks } : {}),
          });
        }
        i++;
        continue;
      }
      if (tok.kind === 'void') {
        if (tok.tag === 'br') out.push({ type: 'hardBreak' });
        i++;
        continue;
      }
      // open
      const tag = tok.tag;
      if (BLOCK_TAGS.has(tag)) {
        // Block inside inline — terminate this inline run.
        return out;
      }
      const markType = INLINE_MARK_TAGS[tag];
      if (markType) {
        i++;
        const nested = parseInlineRun(new Set([tag]), [...marks, { type: markType }]);
        consumeClose(tag);
        out.push(...nested);
        continue;
      }
      if (tag === 'a') {
        const href = tok.attrs.href || '';
        i++;
        const nested = parseInlineRun(
          new Set(['a']),
          [...marks, { type: 'link', attrs: { href } }],
        );
        consumeClose('a');
        out.push(...nested);
        continue;
      }
      // Unknown inline — just descend.
      i++;
      const nested = parseInlineRun(new Set([tag]), marks);
      consumeClose(tag);
      out.push(...nested);
    }
    return out;
  }

  function collectText(stopTags: Set<string>): string {
    let out = '';
    while (i < tokens.length) {
      const tok = tokens[i];
      if (tok.kind === 'close' && stopTags.has(tok.tag)) return out;
      if (tok.kind === 'text') out += tok.text;
      else if (tok.kind === 'void' && tok.tag === 'br') out += '\n';
      i++;
    }
    return out;
  }

  function consumeClose(tag: string): void {
    if (i < tokens.length && tokens[i].kind === 'close' && (tokens[i] as any).tag === tag) {
      i++;
    }
  }

  const content = parseBlocks(new Set());
  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph', content: [] }],
  };
}
