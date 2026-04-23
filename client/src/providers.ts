/** Infer the story tracker name from a URL for display. Server enforces actual support. */
export function detectProviderName(url: string | undefined): string {
  if (!url) return 'Tracker';
  if (/atlassian\.net\/browse\//i.test(url)) return 'Jira';
  if (/dev\.azure\.com\//i.test(url)) return 'Azure DevOps';
  return 'Tracker';
}
