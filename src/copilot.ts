import { execFile } from 'child_process';
import { promisify } from 'util';
import { CommitInfo } from './git';

const execFileAsync = promisify(execFile);

/**
 * Check if GitHub Copilot CLI (gh copilot) is available.
 */
export async function isCopilotCliAvailable(): Promise<boolean> {
  try {
    const { stdout } = await execFileAsync('gh', ['copilot', '--', '--version'], {
      timeout: 15000,
    });
    return stdout.includes('Copilot CLI');
  } catch {
    return false;
  }
}

/**
 * Invoke GitHub Copilot CLI with a prompt.
 * Uses `gh copilot -- -p "prompt"` which is the current Copilot CLI interface.
 */
async function askCopilot(prompt: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync(
      'gh',
      ['copilot', '--', '-p', prompt],
      {
        timeout: 60000,
        maxBuffer: 1024 * 1024,
      }
    );
    return cleanCopilotOutput(stdout);
  } catch (error: any) {
    // If copilot CLI isn't available, fall back to local summarization
    return '';
  }
}

/**
 * Clean ANSI escape codes, usage stats, and extra whitespace from Copilot output.
 */
function cleanCopilotOutput(output: string): string {
  let cleaned = output
    .replace(/\x1B\[[0-9;]*[a-zA-Z]/g, '') // Remove ANSI codes
    .replace(/\r/g, '');

  // Remove the trailing usage statistics block (earliest marker wins)
  const markers = ['\nTotal usage est:', '\nAPI time spent:'];
  let earliest = cleaned.length;
  for (const marker of markers) {
    const idx = cleaned.indexOf(marker);
    if (idx !== -1 && idx < earliest) {
      earliest = idx;
    }
  }
  if (earliest < cleaned.length) {
    cleaned = cleaned.substring(0, earliest);
  }

  return cleaned.trim();
}

/**
 * Format commits into a prompt-friendly string.
 */
function formatCommitsForPrompt(commits: CommitInfo[]): string {
  return commits
    .map((c) => {
      let entry = `- [${c.hashShort}] ${c.message}`;
      if (c.filesChanged.length > 0) {
        entry += ` (files: ${c.filesChanged.slice(0, 5).join(', ')}${c.filesChanged.length > 5 ? '...' : ''})`;
      }
      if (c.diff) {
        entry += ` | ${c.diff}`;
      }
      return entry;
    })
    .join('\n');
}

/**
 * Generate a daily summary using Copilot CLI.
 */
export async function generateDailySummary(
  commits: CommitInfo[],
  repoName: string,
  authorName: string
): Promise<string> {
  if (commits.length === 0) return '';

  const commitList = formatCommitsForPrompt(commits);
  const prompt = `Summarize these git commits from today in the "${repoName}" project by ${authorName} as a short developer journal entry. Group related work together. Use bullet points. Be concise but informative:\n\n${commitList}`;

  return askCopilot(prompt);
}

/**
 * Generate a standup report using Copilot CLI.
 */
export async function generateStandupReport(
  yesterdayCommits: CommitInfo[],
  todayCommits: CommitInfo[],
  repoName: string,
  authorName: string
): Promise<string> {
  const yesterdayList = formatCommitsForPrompt(yesterdayCommits);
  const todayList = formatCommitsForPrompt(todayCommits);

  const prompt = `Generate a standup report for developer ${authorName} on project "${repoName}". Format it as: YESTERDAY (what was done), TODAY (what's planned based on recent work direction), BLOCKERS (potential issues spotted). Yesterday's commits:\n${yesterdayList || 'No commits yesterday'}\n\nToday's commits so far:\n${todayList || 'No commits yet today'}`;

  return askCopilot(prompt);
}

/**
 * Generate a weekly summary using Copilot CLI.
 */
export async function generateWeeklySummary(
  commits: CommitInfo[],
  repoName: string,
  authorName: string
): Promise<string> {
  if (commits.length === 0) return '';

  const commitList = formatCommitsForPrompt(commits);
  const prompt = `Summarize this week's git activity in "${repoName}" by ${authorName} as a weekly developer recap. Highlight key accomplishments, areas of focus, and overall progress. Use sections and bullet points:\n\n${commitList}`;

  return askCopilot(prompt);
}

/**
 * Generate release notes using Copilot CLI.
 */
export async function generateReleaseNotes(
  commits: CommitInfo[],
  repoName: string,
  fromTag: string
): Promise<string> {
  if (commits.length === 0) return '';

  const commitList = formatCommitsForPrompt(commits);
  const prompt = `Generate release notes for "${repoName}" covering changes since ${fromTag}. Categorize into: Features, Bug Fixes, Improvements, and Breaking Changes. Use markdown formatting. Only include categories that have entries:\n\n${commitList}`;

  return askCopilot(prompt);
}

/**
 * Generate a custom range summary using Copilot CLI.
 */
export async function generateRangeSummary(
  commits: CommitInfo[],
  repoName: string,
  from: string,
  to: string
): Promise<string> {
  if (commits.length === 0) return '';

  const commitList = formatCommitsForPrompt(commits);
  const prompt = `Summarize the git activity in "${repoName}" from ${from} to ${to}. Provide a narrative overview of what was accomplished, key changes, and their impact:\n\n${commitList}`;

  return askCopilot(prompt);
}

/**
 * Local fallback summarization when Copilot CLI is not available.
 * This provides basic categorization without AI.
 */
export function localSummarize(commits: CommitInfo[]): string {
  if (commits.length === 0) return 'No commits found in this period.';

  const categories: Record<string, string[]> = {
    features: [],
    fixes: [],
    other: [],
  };

  for (const commit of commits) {
    const msg = commit.message.toLowerCase();
    if (msg.startsWith('feat') || msg.includes('add') || msg.includes('new')) {
      categories.features.push(commit.message);
    } else if (msg.startsWith('fix') || msg.includes('bug') || msg.includes('patch')) {
      categories.fixes.push(commit.message);
    } else {
      categories.other.push(commit.message);
    }
  }

  let summary = '';
  if (categories.features.length > 0) {
    summary += 'Features:\n' + categories.features.map((m) => `  - ${m}`).join('\n') + '\n\n';
  }
  if (categories.fixes.length > 0) {
    summary += 'Fixes:\n' + categories.fixes.map((m) => `  - ${m}`).join('\n') + '\n\n';
  }
  if (categories.other.length > 0) {
    summary += 'Other:\n' + categories.other.map((m) => `  - ${m}`).join('\n') + '\n\n';
  }

  return summary.trim();
}
