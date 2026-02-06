import axios, { AxiosInstance } from 'axios';

interface JiraConfig {
  email: string;
  apiToken: string;
  company: string;
}

interface JiraAttachment {
  id: string;
  filename: string;
  content: string;
  mimeType: string;
}

interface JiraIssue {
  key: string;
  fields: {
    summary?: string;
    description?: any;
    attachment?: JiraAttachment[];
  };
}

export interface JiraStoryData {
  name: string;
  description: string;
}

interface MediaIdMap {
  [mediaId: string]: string; // mediaId -> base64 data URL
}

export class JiraClient {
  private client: AxiosInstance | null = null;
  private company: string | null = null;

  constructor() {
    const email = process.env.JIRA_EMAIL;
    const apiToken = process.env.JIRA_API_TOKEN;
    const company = process.env.JIRA_COMPANY;

    if (email && apiToken && company) {
      this.company = company;
      this.client = axios.create({
        baseURL: `https://${company}.atlassian.net/rest/api/3`,
        auth: {
          username: email,
          password: apiToken,
        },
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
      });
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  isJiraUrl(url: string): boolean {
    if (!this.company) return false;
    const jiraPattern = new RegExp(`https://${this.company}\\.atlassian\\.net/browse/([A-Z]+-\\d+)`);
    return jiraPattern.test(url);
  }

  extractTicketKey(url: string): string | null {
    if (!this.company) return null;
    const jiraPattern = new RegExp(`https://${this.company}\\.atlassian\\.net/browse/([A-Z]+-\\d+)`);
    const match = url.match(jiraPattern);
    return match ? match[1] : null;
  }

  async fetchTicket(ticketKey: string): Promise<JiraIssue | null> {
    if (!this.client) {
      console.warn('Jira client not configured');
      return null;
    }

    try {
      const response = await this.client.get(`/issue/${ticketKey}`, {
        params: {
          fields: 'summary,description,attachment',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch Jira ticket ${ticketKey}:`, error);
      return null;
    }
  }

  async downloadImageAsBase64(url: string): Promise<string | null> {
    if (!this.client) return null;

    try {
      const response = await axios.get<ArrayBuffer>(url, {
        auth: this.client.defaults.auth,
        responseType: 'arraybuffer',
      });

      const base64 = Buffer.from(response.data as ArrayBuffer).toString('base64');
      const contentType = response.headers['content-type'] || 'image/png';
      return `data:${contentType};base64,${base64}`;
    } catch (error) {
      console.error(`Failed to download image from ${url}:`, error);
      return null;
    }
  }

  async convertAdfToTipTap(adf: any, attachments: JiraAttachment[]): Promise<string> {
    // Build a map of media IDs to attachment URLs
    const mediaMap: { [id: string]: JiraAttachment } = {};
    attachments.forEach(attachment => {
      // Jira uses the attachment ID as the media ID
      mediaMap[attachment.id] = attachment;
    });

    // Download all images and create a map of media IDs to base64 data URLs
    const base64Map: MediaIdMap = {};
    for (const attachment of attachments) {
      if (attachment.mimeType.startsWith('image/')) {
        const base64Data = await this.downloadImageAsBase64(attachment.content);
        if (base64Data) {
          base64Map[attachment.id] = base64Data;
        }
      }
    }

    // Convert ADF content to TipTap JSON
    const tipTapContent = this.convertAdfNode(adf, base64Map);

    return JSON.stringify(tipTapContent);
  }

  private convertAdfNode(node: any, base64Map: MediaIdMap): any {
    if (!node || !node.type) return null;

    switch (node.type) {
      case 'doc':
        return {
          type: 'doc',
          content: node.content?.map((child: any) => this.convertAdfNode(child, base64Map)).filter(Boolean) || [],
        };

      case 'paragraph':
        return {
          type: 'paragraph',
          content: node.content?.map((child: any) => this.convertAdfNode(child, base64Map)).filter(Boolean) || [],
        };

      case 'text':
        const marks = node.marks?.map((mark: any) => this.convertAdfMark(mark)).filter(Boolean) || [];
        return {
          type: 'text',
          text: node.text,
          ...(marks.length > 0 && { marks }),
        };

      case 'bulletList':
        return {
          type: 'bulletList',
          content: node.content?.map((child: any) => this.convertAdfNode(child, base64Map)).filter(Boolean) || [],
        };

      case 'orderedList':
        return {
          type: 'orderedList',
          content: node.content?.map((child: any) => this.convertAdfNode(child, base64Map)).filter(Boolean) || [],
        };

      case 'listItem':
        return {
          type: 'listItem',
          content: node.content?.map((child: any) => this.convertAdfNode(child, base64Map)).filter(Boolean) || [],
        };

      case 'heading':
        return {
          type: 'heading',
          attrs: { level: node.attrs?.level || 1 },
          content: node.content?.map((child: any) => this.convertAdfNode(child, base64Map)).filter(Boolean) || [],
        };

      case 'codeBlock':
        return {
          type: 'codeBlock',
          content: node.content?.map((child: any) => this.convertAdfNode(child, base64Map)).filter(Boolean) || [],
        };

      case 'blockquote':
        return {
          type: 'blockquote',
          content: node.content?.map((child: any) => this.convertAdfNode(child, base64Map)).filter(Boolean) || [],
        };

      case 'mediaSingle':
        // Extract media node
        const mediaNode = node.content?.[0];
        if (mediaNode && mediaNode.type === 'media') {
          const mediaId = mediaNode.attrs?.id;
          const base64Src = base64Map[mediaId];

          if (base64Src) {
            // Convert to TipTap image
            return {
              type: 'paragraph',
              content: [
                {
                  type: 'image',
                  attrs: {
                    src: base64Src,
                    alt: mediaNode.attrs?.alt || '',
                  },
                },
              ],
            };
          }
        }
        return null;

      case 'hardBreak':
        return { type: 'hardBreak' };

      case 'rule':
        return { type: 'horizontalRule' };

      default:
        console.warn(`Unsupported ADF node type: ${node.type}`);
        return null;
    }
  }

  private convertAdfMark(mark: any): any {
    switch (mark.type) {
      case 'strong':
        return { type: 'bold' };
      case 'em':
        return { type: 'italic' };
      case 'strike':
        return { type: 'strike' };
      case 'code':
        return { type: 'code' };
      case 'link':
        return {
          type: 'link',
          attrs: { href: mark.attrs?.href || '' },
        };
      default:
        console.warn(`Unsupported ADF mark type: ${mark.type}`);
        return null;
    }
  }

  async enrichStoryFromJiraUrl(url: string): Promise<JiraStoryData | null> {
    if (!this.isJiraUrl(url)) {
      return null;
    }

    const ticketKey = this.extractTicketKey(url);
    if (!ticketKey) {
      return null;
    }

    const issue = await this.fetchTicket(ticketKey);
    if (!issue) {
      return null;
    }

    // Extract summary (title) - required
    const name = issue.fields.summary;
    if (!name) {
      console.error('Jira ticket has no summary field');
      return null;
    }

    // Extract and convert description - optional
    let description = '';
    if (issue.fields.description) {
      const attachments = issue.fields.attachment || [];
      description = await this.convertAdfToTipTap(issue.fields.description, attachments);
    }

    return {
      name,
      description,
    };
  }

  async updateStoryPoints(url: string, storyPoints: string): Promise<boolean> {
    if (!this.client) {
      console.warn('Jira client not configured');
      return false;
    }

    if (!this.isJiraUrl(url)) {
      console.warn('Invalid JIRA URL');
      return false;
    }

    const ticketKey = this.extractTicketKey(url);
    if (!ticketKey) {
      console.warn('Could not extract ticket key from URL');
      return false;
    }

    try {
      // Update the story points field (customfield_10016 is the common field ID for story points)
      // Note: The field ID may vary by JIRA instance. Common ones are:
      // - customfield_10016 (most common)
      // - customfield_10004
      // - story_points
      const numericValue = parseFloat(storyPoints);
      const updateData = {
        fields: {
          customfield_10016: isNaN(numericValue) ? null : numericValue,
        },
      };

      await this.client.put(`/issue/${ticketKey}`, updateData);
      console.log(`Successfully updated story points for ${ticketKey} to ${storyPoints}`);
      return true;
    } catch (error: any) {
      if (error.response?.status === 400) {
        console.error(`Failed to update story points for ${ticketKey}. The field ID may be incorrect for your JIRA instance.`);
        console.error('Error details:', error.response?.data);
      } else {
        console.error(`Failed to update story points for ${ticketKey}:`, error);
      }
      return false;
    }
  }
}
