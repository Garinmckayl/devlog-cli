#!/usr/bin/env node

import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

import {
  getCommitsToday,
  getCommitsYesterday,
  getCommitsThisWeek,
  getCommitsSinceTag,
  getCommitsRange,
  groupCommitsByDate,
  getRepoName,
  getCurrentBranch,
  getAuthorName,
} from './git';

import {
  isCopilotCliAvailable,
  generateDailySummary,
  generateStandupReport,
  generateWeeklySummary,
  generateReleaseNotes,
  generateRangeSummary,
  localSummarize,
} from './copilot';

import {
  printBanner,
  printHeader,
  printCommitList,
  printGroupedCommits,
  printSummary,
  printReleaseNotes as printReleaseNotesUI,
  printStats,
  printInfo,
  printWarning,
  printError,
  printCopilotStatus,
  printFooter,
} from './ui';

import {
  exportDailyMarkdown,
  exportWeeklyMarkdown,
  exportReleaseMarkdown,
  exportJSON,
} from './export';

import { loadConfig, generateSampleConfig } from './config';

const program = new Command();

program
  .name('devlog')
  .description(
    'AI-powered developer journal — transforms your git history into meaningful narratives using GitHub Copilot CLI'
  )
  .version('1.0.0');

// ─── TODAY ────────────────────────────────────────────────────────────────────

program
  .command('today')
  .description("Summarize what you've worked on today")
  .option('-o, --output <file>', 'Save output to a markdown file')
  .option('--json', 'Output as JSON')
  .option('--no-ai', 'Skip AI summarization')
  .action(async (options) => {
    printBanner();

    const config = loadConfig();
    const copilotAvailable = await isCopilotCliAvailable();
    printCopilotStatus(copilotAvailable);

    const spinner = ora({ text: 'Reading git history...', indent: 3 }).start();

    try {
      const [commits, repoName, branch, authorName] = await Promise.all([
        getCommitsToday(),
        getRepoName(),
        getCurrentBranch(),
        getAuthorName(),
      ]);

      spinner.stop();

      printHeader(
        `Today's Work — ${repoName}`,
        `Branch: ${branch} • Author: ${authorName}`
      );

      if (commits.length === 0) {
        printWarning('No commits found for today. Time to get coding!');
        printFooter();
        return;
      }

      printStats(commits);
      printCommitList(commits);

      // AI Summary
      let aiSummary = '';
      if (options.ai !== false && copilotAvailable && config.useCopilot) {
        const aiSpinner = ora({
          text: 'Generating AI summary with Copilot CLI...',
          indent: 3,
        }).start();
        aiSummary = await generateDailySummary(commits, repoName, authorName);
        aiSpinner.stop();

        if (aiSummary) {
          printSummary('AI Summary', aiSummary);
        } else {
          // Fallback if Copilot returned empty
          aiSummary = localSummarize(commits);
          if (aiSummary) printSummary('Summary', aiSummary);
        }
      } else if (options.ai !== false) {
        aiSummary = localSummarize(commits);
        printSummary('Summary', aiSummary);
      }

      // Export options
      if (options.output) {
        const md = exportDailyMarkdown(
          repoName,
          new Date().toLocaleDateString(),
          commits,
          aiSummary
        );
        fs.writeFileSync(options.output, md);
        printInfo(`Saved to ${options.output}`);
      }

      if (options.json) {
        console.log(
          exportJSON({
            type: 'daily',
            repo: repoName,
            branch,
            author: authorName,
            date: new Date().toISOString(),
            commitCount: commits.length,
            commits: commits,
            summary: aiSummary,
          })
        );
      }

      printFooter();
    } catch (error: any) {
      spinner.stop();
      printError(error.message);
      process.exit(1);
    }
  });

// ─── STANDUP ──────────────────────────────────────────────────────────────────

program
  .command('standup')
  .description('Generate a standup-ready report')
  .option('-o, --output <file>', 'Save output to a markdown file')
  .option('--json', 'Output as JSON')
  .option('--no-ai', 'Skip AI summarization')
  .action(async (options) => {
    printBanner();

    const config = loadConfig();
    const copilotAvailable = await isCopilotCliAvailable();
    printCopilotStatus(copilotAvailable);

    const spinner = ora({ text: 'Preparing standup report...', indent: 3 }).start();

    try {
      const [yesterdayCommits, todayCommits, repoName, branch, authorName] =
        await Promise.all([
          getCommitsYesterday(),
          getCommitsToday(),
          getRepoName(),
          getCurrentBranch(),
          getAuthorName(),
        ]);

      spinner.stop();

      printHeader(
        `Standup Report — ${repoName}`,
        `Branch: ${branch} • ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}`
      );

      // Show yesterday's commits
      if (yesterdayCommits.length > 0) {
        console.log(chalk.bold.blue('   Yesterday:'));
        printCommitList(yesterdayCommits);
      } else {
        console.log(chalk.dim('   No commits yesterday.\n'));
      }

      // Show today's commits
      if (todayCommits.length > 0) {
        console.log(chalk.bold.green('   Today so far:'));
        printCommitList(todayCommits);
      } else {
        console.log(chalk.dim('   No commits today yet.\n'));
      }

      // AI-generated standup
      let aiSummary = '';
      if (options.ai !== false && copilotAvailable && config.useCopilot) {
        const aiSpinner = ora({
          text: 'Generating AI standup with Copilot CLI...',
          indent: 3,
        }).start();
        aiSummary = await generateStandupReport(
          yesterdayCommits,
          todayCommits,
          repoName,
          authorName
        );
        aiSpinner.stop();

        if (aiSummary) {
          printSummary('AI Standup Report', aiSummary);
        } else {
          // Fallback if Copilot returned empty
          const allCommits = [...yesterdayCommits, ...todayCommits];
          aiSummary = localSummarize(allCommits);
          if (aiSummary) printSummary('Summary', aiSummary);
        }
      } else if (options.ai !== false) {
        const allCommits = [...yesterdayCommits, ...todayCommits];
        aiSummary = localSummarize(allCommits);
        if (aiSummary) printSummary('Summary', aiSummary);
      }

      // Export
      if (options.output) {
        const content = exportDailyMarkdown(repoName, new Date().toLocaleDateString(), [...yesterdayCommits, ...todayCommits], aiSummary || '');
        fs.writeFileSync(options.output, content);
        printInfo(`Exported to ${options.output}`);
      }

      if (options.json) {
        console.log(
          exportJSON({
            type: 'standup',
            repo: repoName,
            branch,
            author: authorName,
            date: new Date().toISOString(),
            yesterday: yesterdayCommits,
            today: todayCommits,
          })
        );
      }

      printFooter();
    } catch (error: any) {
      spinner.stop();
      printError(error.message);
      process.exit(1);
    }
  });

// ─── WEEK ─────────────────────────────────────────────────────────────────────

program
  .command('week')
  .description("Summarize this week's work")
  .option('-o, --output <file>', 'Save output to a markdown file')
  .option('--json', 'Output as JSON')
  .option('--no-ai', 'Skip AI summarization')
  .action(async (options) => {
    printBanner();

    const config = loadConfig();
    const copilotAvailable = await isCopilotCliAvailable();
    printCopilotStatus(copilotAvailable);

    const spinner = ora({ text: 'Reading weekly git history...', indent: 3 }).start();

    try {
      const [commits, repoName, branch, authorName] = await Promise.all([
        getCommitsThisWeek(),
        getRepoName(),
        getCurrentBranch(),
        getAuthorName(),
      ]);

      spinner.stop();

      printHeader(
        `Weekly Recap — ${repoName}`,
        `Branch: ${branch} • Author: ${authorName}`
      );

      if (commits.length === 0) {
        printWarning('No commits found this week.');
        printFooter();
        return;
      }

      printStats(commits);

      const groups = groupCommitsByDate(commits);
      printGroupedCommits(groups);

      // AI Summary
      let aiSummary = '';
      if (options.ai !== false && copilotAvailable && config.useCopilot) {
        const aiSpinner = ora({
          text: 'Generating weekly AI recap with Copilot CLI...',
          indent: 3,
        }).start();
        aiSummary = await generateWeeklySummary(commits, repoName, authorName);
        aiSpinner.stop();

        if (aiSummary) {
          printSummary('AI Weekly Recap', aiSummary);
        } else {
          // Fallback if Copilot returned empty
          aiSummary = localSummarize(commits);
          if (aiSummary) printSummary('Weekly Summary', aiSummary);
        }
      } else if (options.ai !== false) {
        aiSummary = localSummarize(commits);
        printSummary('Weekly Summary', aiSummary);
      }

      // Export
      if (options.output) {
        const md = exportWeeklyMarkdown(repoName, groups, aiSummary, commits.length);
        fs.writeFileSync(options.output, md);
        printInfo(`Saved to ${options.output}`);
      }

      if (options.json) {
        console.log(
          exportJSON({
            type: 'weekly',
            repo: repoName,
            branch,
            author: authorName,
            week: new Date().toISOString(),
            commitCount: commits.length,
            groups: groups,
            summary: aiSummary,
          })
        );
      }

      printFooter();
    } catch (error: any) {
      spinner.stop();
      printError(error.message);
      process.exit(1);
    }
  });

// ─── RELEASE ──────────────────────────────────────────────────────────────────

program
  .command('release')
  .description('Generate release notes from commits since last tag')
  .option('-o, --output <file>', 'Save output to a markdown file')
  .option('--json', 'Output as JSON')
  .option('--no-ai', 'Skip AI summarization')
  .action(async (options) => {
    printBanner();

    const config = loadConfig();
    const copilotAvailable = await isCopilotCliAvailable();
    printCopilotStatus(copilotAvailable);

    const spinner = ora({ text: 'Finding latest tag and commits...', indent: 3 }).start();

    try {
      const [{ tag, commits }, repoName] = await Promise.all([
        getCommitsSinceTag(),
        getRepoName(),
      ]);

      spinner.stop();

      printHeader(
        `Release Notes — ${repoName}`,
        `Since tag: ${tag} • ${commits.length} commits`
      );

      if (commits.length === 0) {
        printWarning('No new commits since last tag.');
        printFooter();
        return;
      }

      printStats(commits);
      printCommitList(commits);

      // AI Release Notes
      let aiSummary = '';
      if (options.ai !== false && copilotAvailable && config.useCopilot) {
        const aiSpinner = ora({
          text: 'Generating AI release notes with Copilot CLI...',
          indent: 3,
        }).start();
        aiSummary = await generateReleaseNotes(commits, repoName, tag);
        aiSpinner.stop();

        if (aiSummary) {
          printReleaseNotesUI(tag, aiSummary, commits.length);
        } else {
          // Fallback if Copilot returned empty
          aiSummary = localSummarize(commits);
          if (aiSummary) printSummary('Release Summary', aiSummary);
        }
      } else if (options.ai !== false) {
        aiSummary = localSummarize(commits);
        printSummary('Release Summary', aiSummary);
      }

      // Export
      if (options.output) {
        const md = exportReleaseMarkdown(repoName, tag, commits, aiSummary);
        fs.writeFileSync(options.output, md);
        printInfo(`Saved to ${options.output}`);
      }

      if (options.json) {
        console.log(
          exportJSON({
            type: 'release',
            repo: repoName,
            tag,
            commitCount: commits.length,
            commits: commits,
            releaseNotes: aiSummary,
          })
        );
      }

      printFooter();
    } catch (error: any) {
      spinner.stop();
      printError(error.message);
      process.exit(1);
    }
  });

// ─── RECAP (custom range) ────────────────────────────────────────────────────

program
  .command('recap <range>')
  .description('Summarize a custom commit range (e.g., abc123..def456 or HEAD~10..HEAD)')
  .option('-o, --output <file>', 'Save output to a markdown file')
  .option('--json', 'Output as JSON')
  .option('--no-ai', 'Skip AI summarization')
  .action(async (range, options) => {
    printBanner();

    const config = loadConfig();
    const copilotAvailable = await isCopilotCliAvailable();
    printCopilotStatus(copilotAvailable);

    const parts = range.split('..');
    if (parts.length !== 2) {
      printError(
        'Invalid range format. Use: devlog recap <from>..<to> (e.g., HEAD~10..HEAD)'
      );
      process.exit(1);
    }

    const [from, to] = parts;
    const spinner = ora({ text: `Reading commits ${from}..${to}...`, indent: 3 }).start();

    try {
      const [commits, repoName] = await Promise.all([
        getCommitsRange(from, to),
        getRepoName(),
      ]);

      spinner.stop();

      printHeader(`Recap — ${repoName}`, `Range: ${from}..${to}`);

      if (commits.length === 0) {
        printWarning('No commits found in this range.');
        printFooter();
        return;
      }

      printStats(commits);

      const groups = groupCommitsByDate(commits);
      printGroupedCommits(groups);

      // AI Summary
      let aiSummary = '';
      if (options.ai !== false && copilotAvailable && config.useCopilot) {
        const aiSpinner = ora({
          text: 'Generating AI recap with Copilot CLI...',
          indent: 3,
        }).start();
        aiSummary = await generateRangeSummary(commits, repoName, from, to);
        aiSpinner.stop();

        if (aiSummary) {
          printSummary('AI Recap', aiSummary);
        } else {
          // Fallback if Copilot returned empty
          aiSummary = localSummarize(commits);
          if (aiSummary) printSummary('Recap', aiSummary);
        }
      } else if (options.ai !== false) {
        aiSummary = localSummarize(commits);
        printSummary('Recap', aiSummary);
      }

      // Export
      if (options.output) {
        const content = exportDailyMarkdown(repoName, `${from}..${to}`, commits, aiSummary || '');
        fs.writeFileSync(options.output, content);
        printInfo(`Exported to ${options.output}`);
      }

      if (options.json) {
        console.log(
          exportJSON({
            type: 'recap',
            repo: repoName,
            range: { from, to },
            commitCount: commits.length,
            commits: commits,
            summary: aiSummary,
          })
        );
      }

      printFooter();
    } catch (error: any) {
      spinner.stop();
      printError(error.message);
      process.exit(1);
    }
  });

// ─── INIT ─────────────────────────────────────────────────────────────────────

program
  .command('init')
  .description('Create a .devlogrc config file in the current directory')
  .action(() => {
    const configPath = path.join(process.cwd(), '.devlogrc');
    if (fs.existsSync(configPath)) {
      printWarning('.devlogrc already exists in this directory.');
      return;
    }
    fs.writeFileSync(configPath, generateSampleConfig());
    printInfo(`Created .devlogrc in ${process.cwd()}`);
  });

// ─── STATUS ───────────────────────────────────────────────────────────────────

program
  .command('status')
  .description('Check devlog setup and Copilot CLI availability')
  .action(async () => {
    printBanner();

    try {
      const [repoName, branch, authorName] = await Promise.all([
        getRepoName(),
        getCurrentBranch(),
        getAuthorName(),
      ]);

      printHeader('Status');
      printInfo(`Repository: ${repoName}`);
      printInfo(`Branch: ${branch}`);
      printInfo(`Author: ${authorName}`);
      console.log();

      const copilotAvailable = await isCopilotCliAvailable();
      printCopilotStatus(copilotAvailable);

      const config = loadConfig();
      printInfo(`Config: format=${config.format}, useCopilot=${config.useCopilot}`);
      console.log();

      printFooter();
    } catch (error: any) {
      printError(error.message);
      process.exit(1);
    }
  });

// Parse and execute
program.parse();

// Show help if no command provided
if (!process.argv.slice(2).length) {
  printBanner();
  program.outputHelp();
}

process.on('unhandledRejection', (error) => {
  console.error(`Unexpected error: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
