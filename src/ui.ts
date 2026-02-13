import chalk from 'chalk';
import boxen from 'boxen';
import { CommitInfo, CommitGroup } from './git';

const MAX_WIDTH = 75;

/**
 * Wrap text to fit within a maximum width, preserving existing newlines.
 */
function wrapText(text: string, width: number): string {
  return text
    .split('\n')
    .map((line) => {
      if (line.length <= width) return line;
      const words = line.split(' ');
      const lines: string[] = [];
      let current = '';
      for (const word of words) {
        if (current.length + word.length + 1 > width && current.length > 0) {
          lines.push(current);
          current = word;
        } else {
          current = current ? current + ' ' + word : word;
        }
      }
      if (current) lines.push(current);
      return lines.join('\n');
    })
    .join('\n');
}

const ICONS = {
  commit: '\u25CF',    // ●
  branch: '\u251C',    // ├
  last: '\u2514',      // └
  pipe: '\u2502',      // │
  header: '\u2550',    // ═
  bullet: '\u25B8',    // ▸
  check: '\u2713',     // ✓
  arrow: '\u25B6',     // ▶
  calendar: '\uD83D\uDCC5',  // 📅
  rocket: '\uD83D\uDE80',    // 🚀
  brain: '\uD83E\uDDE0',     // 🧠
  memo: '\uD83D\uDCDD',      // 📝
  sparkle: '\u2728',          // ✨
};

export function printBanner(): void {
  const banner = boxen(
    chalk.bold.cyan('devlog') +
      chalk.dim(' \u2014 AI-powered developer journal\n') +
      chalk.dim('Powered by GitHub Copilot CLI \u2728'),
    {
      padding: 1,
      margin: { top: 1, bottom: 1, left: 0, right: 0 },
      borderStyle: 'round',
      borderColor: 'cyan',
    }
  );
  console.log(banner);
}

export function printHeader(title: string, subtitle?: string): void {
  console.log();
  console.log(chalk.bold.cyan(`${ICONS.header.repeat(2)} ${title}`));
  if (subtitle) {
    console.log(chalk.dim(`   ${subtitle}`));
  }
  console.log();
}

export function printCommitList(commits: CommitInfo[]): void {
  if (commits.length === 0) {
    console.log(chalk.dim('   No commits found.'));
    return;
  }

  commits.forEach((commit, i) => {
    const isLast = i === commits.length - 1;
    const prefix = isLast ? ICONS.last : ICONS.branch;
    const pipePrefix = isLast ? ' ' : ICONS.pipe;

    // Color commit message based on conventional commit prefix
    const msgColor = commit.message.startsWith('feat') ? chalk.green
      : commit.message.startsWith('fix') ? chalk.red
      : commit.message.startsWith('docs') ? chalk.blue
      : commit.message.startsWith('refactor') ? chalk.magenta
      : commit.message.startsWith('test') ? chalk.yellow
      : commit.message.startsWith('chore') ? chalk.gray
      : chalk.white;

    console.log(
      chalk.dim(`   ${prefix}`) +
        chalk.yellow(` ${commit.hashShort}`) +
        msgColor(` ${commit.message}`)
    );
    console.log(
      chalk.dim(`   ${pipePrefix}  `) +
        chalk.dim(`${commit.author} \u2022 ${formatDate(commit.date)}`)
    );

    if (commit.filesChanged.length > 0) {
      const fileList = commit.filesChanged.slice(0, 3).join(', ');
      const more =
        commit.filesChanged.length > 3
          ? ` +${commit.filesChanged.length - 3} more`
          : '';
      console.log(
        chalk.dim(`   ${pipePrefix}  `) +
          chalk.dim.italic(`${fileList}${more}`)
      );
    }
    if (!isLast) console.log(chalk.dim(`   ${pipePrefix}`));
  });
  console.log();
}

export function printGroupedCommits(groups: CommitGroup[]): void {
  for (const group of groups) {
    console.log(
      chalk.bold.white(`   ${ICONS.arrow} ${group.label}`) +
        chalk.dim(` (${group.commits.length} commits)`)
    );
    console.log();
    printCommitList(group.commits);
  }
}

export function printSummary(title: string, content: string): void {
  if (!content) return;

  const box = boxen(wrapText(content, MAX_WIDTH - 6), {
    title: chalk.bold.cyan(title),
    titleAlignment: 'left',
    padding: 1,
    margin: { top: 0, bottom: 1, left: 3, right: 0 },
    borderStyle: 'round',
    borderColor: 'gray',
  });
  console.log(box);
}

export function printStandup(
  yesterday: string,
  today: string,
  blockers: string
): void {
  const sections = [
    { title: 'Yesterday', content: yesterday, color: chalk.blue },
    { title: 'Today', content: today, color: chalk.green },
    { title: 'Blockers', content: blockers, color: chalk.red },
  ];

  for (const section of sections) {
    if (section.content) {
      console.log(`   ${section.color.bold(`${ICONS.bullet} ${section.title}`)}`);
      const lines = section.content.split('\n');
      for (const line of lines) {
        console.log(`     ${chalk.white(line)}`);
      }
      console.log();
    }
  }
}

export function printReleaseNotes(
  tag: string,
  content: string,
  commitCount: number
): void {
  console.log(
    chalk.dim('   ') +
      chalk.bold.magenta(`Release notes since ${tag}`) +
      chalk.dim(` (${commitCount} commits)`)
  );
  console.log();

  if (content) {
    const lines = content.split('\n');
    for (const line of lines) {
      console.log(`   ${chalk.white(line)}`);
    }
  }
  console.log();
}

export function printStats(commits: CommitInfo[]): void {
  if (commits.length === 0) return;

  const authors = new Set(commits.map((c) => c.author));
  const totalFiles = new Set(commits.flatMap((c) => c.filesChanged));

  const stats = [
    `${chalk.cyan(String(commits.length))} commits`,
    `${chalk.cyan(String(authors.size))} ${authors.size === 1 ? 'author' : 'authors'}`,
    `${chalk.cyan(String(totalFiles.size))} files changed`,
  ].join(chalk.dim(' • '));

  console.log(chalk.dim('   ') + stats);
  console.log();
}

export function printInfo(message: string): void {
  console.log(chalk.dim(`   ${ICONS.check} ${message}`));
}

export function printWarning(message: string): void {
  console.log(chalk.yellow(`   ⚠ ${message}`));
}

export function printError(message: string): void {
  console.log(chalk.red(`   ✗ ${message}`));
}

export function printCopilotStatus(available: boolean): void {
  if (available) {
    console.log(
      chalk.dim('   ') +
        chalk.green(`${ICONS.check} GitHub Copilot CLI detected`) +
        chalk.dim(' \u2014 AI summaries enabled ') +
        chalk.green(ICONS.brain)
    );
  } else {
    console.log(
      chalk.dim('   ') +
        chalk.yellow('⚠ GitHub Copilot CLI not found') +
        chalk.dim(' — using local summaries')
    );
    console.log(
      chalk.dim('     Install: ') +
        chalk.cyan('gh extension install github/gh-copilot')
    );
  }
  console.log();
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function printFooter(): void {
  console.log(
    chalk.dim(
      '   Generated by devlog • Powered by GitHub Copilot CLI'
    )
  );
  console.log();
}
