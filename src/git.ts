import { SimpleGit, simpleGit, LogResult, DefaultLogFields } from 'simple-git';
import {
  startOfDay,
  endOfDay,
  subDays,
  startOfWeek,
  endOfWeek,
  format,
  parseISO,
} from 'date-fns';

export interface CommitInfo {
  hash: string;
  hashShort: string;
  date: string;
  message: string;
  body: string;
  author: string;
  email: string;
  filesChanged: string[];
  diff: string;
}

export interface CommitGroup {
  label: string;
  commits: CommitInfo[];
}

export async function getGit(cwd?: string): Promise<SimpleGit> {
  const git = simpleGit(cwd || process.cwd());
  const isRepo = await git.checkIsRepo();
  if (!isRepo) {
    throw new Error(
      'Not a git repository. Please run devlog from inside a git repository.'
    );
  }
  return git;
}

async function getCommitDiff(
  git: SimpleGit,
  hash: string
): Promise<{ diff: string; files: string[] }> {
  try {
    const diff = await git.diff([`${hash}~1`, hash, '--stat']);
    const diffDetail = await git.diff([`${hash}~1`, hash, '--shortstat']);
    const files = diff
      .split('\n')
      .filter((line) => line.includes('|'))
      .map((line) => line.split('|')[0].trim());
    return { diff: diffDetail.trim(), files };
  } catch {
    // First commit in repo has no parent
    return { diff: '', files: [] };
  }
}

async function parseLogResult(
  git: SimpleGit,
  log: LogResult<DefaultLogFields>
): Promise<CommitInfo[]> {
  const commits: CommitInfo[] = [];
  for (const entry of log.all) {
    const { diff, files } = await getCommitDiff(git, entry.hash);
    commits.push({
      hash: entry.hash,
      hashShort: entry.hash.substring(0, 7),
      date: entry.date,
      message: entry.message,
      body: entry.body,
      author: entry.author_name,
      email: entry.author_email,
      filesChanged: files,
      diff,
    });
  }
  return commits;
}

export async function getCommitsToday(cwd?: string): Promise<CommitInfo[]> {
  const git = await getGit(cwd);
  const todayStart = format(startOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss");
  const todayEnd = format(endOfDay(new Date()), "yyyy-MM-dd'T'HH:mm:ss");
  const log = await git.log({ '--after': todayStart, '--before': todayEnd });
  return parseLogResult(git, log);
}

export async function getCommitsYesterday(cwd?: string): Promise<CommitInfo[]> {
  const git = await getGit(cwd);
  const yesterday = subDays(new Date(), 1);
  const yStart = format(startOfDay(yesterday), "yyyy-MM-dd'T'HH:mm:ss");
  const yEnd = format(endOfDay(yesterday), "yyyy-MM-dd'T'HH:mm:ss");
  const log = await git.log({ '--after': yStart, '--before': yEnd });
  return parseLogResult(git, log);
}

export async function getCommitsThisWeek(cwd?: string): Promise<CommitInfo[]> {
  const git = await getGit(cwd);
  const weekStart = format(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd'T'HH:mm:ss"
  );
  const weekEnd = format(
    endOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd'T'HH:mm:ss"
  );
  const log = await git.log({ '--after': weekStart, '--before': weekEnd });
  return parseLogResult(git, log);
}

export async function getCommitsSinceTag(cwd?: string): Promise<{
  tag: string;
  commits: CommitInfo[];
}> {
  const git = await getGit(cwd);
  let tag = '';
  try {
    tag = (await git.raw(['describe', '--tags', '--abbrev=0'])).trim();
  } catch {
    // No tags found; get all commits
    const log = await git.log();
    return { tag: '(initial)', commits: await parseLogResult(git, log) };
  }
  const log = await git.log({ from: tag, to: 'HEAD' });
  return { tag, commits: await parseLogResult(git, log) };
}

export async function getCommitsRange(
  from: string,
  to: string,
  cwd?: string
): Promise<CommitInfo[]> {
  const git = await getGit(cwd);
  const log = await git.log({ from, to });
  return parseLogResult(git, log);
}

export function groupCommitsByDate(commits: CommitInfo[]): CommitGroup[] {
  const groups: Map<string, CommitInfo[]> = new Map();
  for (const commit of commits) {
    const dateKey = format(parseISO(commit.date), 'yyyy-MM-dd');
    if (!groups.has(dateKey)) {
      groups.set(dateKey, []);
    }
    groups.get(dateKey)!.push(commit);
  }
  const result: CommitGroup[] = [];
  for (const [dateKey, groupCommits] of groups) {
    const label = format(parseISO(groupCommits[0].date), 'EEEE, MMMM d, yyyy');
    result.push({ label, commits: groupCommits });
  }
  return result.sort((a, b) => new Date(b.commits[0].date).getTime() - new Date(a.commits[0].date).getTime());
}

export async function getRepoName(cwd?: string): Promise<string> {
  const git = await getGit(cwd);
  try {
    const remote = await git.remote(['get-url', 'origin']);
    if (remote) {
      const match = remote.trim().match(/\/([^/]+?)(\.git)?$/);
      if (match) return match[1];
    }
  } catch {
    // no remote
  }
  // Fallback to directory name
  const root = await git.revparse(['--show-toplevel']);
  return root.trim().split('/').pop() || 'unknown';
}

export async function getCurrentBranch(cwd?: string): Promise<string> {
  const git = await getGit(cwd);
  const branch = await git.revparse(['--abbrev-ref', 'HEAD']);
  return branch.trim();
}

export async function getAuthorName(cwd?: string): Promise<string> {
  const git = await getGit(cwd);
  try {
    const name = await git.raw(['config', 'user.name']);
    return name.trim();
  } catch {
    return 'Developer';
  }
}
