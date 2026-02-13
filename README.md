# devlog

**AI-powered developer journal that transforms your git history into meaningful narratives using GitHub Copilot CLI.**

devlog reads your git commits and uses [GitHub Copilot CLI](https://github.com/github/copilot-cli) to generate human-readable developer journals, standup reports, weekly recaps, and release notes — all from your terminal.

## Demo

### AI-powered daily journal from your git history

[![devlog today demo](https://asciinema.org/a/qckuaeQ4Ifdswund.svg)](https://asciinema.org/a/qckuaeQ4Ifdswund)

### Standup report — Copilot CLI reads your source code and finds real blockers

[![devlog standup demo](https://asciinema.org/a/f68w95p4etmzxSKx.svg)](https://asciinema.org/a/f68w95p4etmzxSKx)

## Why devlog?

Developers write commit messages, but rarely take time to reflect on what they actually accomplished. devlog bridges that gap by turning raw git history into:

- **Daily journals** — What did I actually do today?
- **Standup reports** — Ready-to-share yesterday/today/blockers format
- **Weekly recaps** — High-level view of your week's progress
- **Release notes** — Auto-categorized changelogs from tags
- **Custom recaps** — Summarize any commit range

All powered by GitHub Copilot CLI for intelligent, context-aware summaries.

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Git](https://git-scm.com/)
- [GitHub CLI](https://cli.github.com/) with [Copilot extension](https://github.com/github/copilot-cli)

### Install GitHub Copilot CLI

```bash
# Install GitHub CLI if you haven't
brew install gh  # macOS
# or: sudo apt install gh  # Ubuntu/Debian

# Authenticate
gh auth login

# Install Copilot CLI extension
gh extension install github/gh-copilot
```

### Install devlog

```bash
# Clone the repository
git clone https://github.com/Garinmckayl/devlog-cli.git
cd devlog

# Install dependencies and build
npm install
npm run build

# Link globally (optional)
npm link
```

## Usage

Run devlog from any git repository:

### Daily Summary

```bash
devlog today
```

Summarizes all commits from today with an AI-generated narrative.

### Standup Report

```bash
devlog standup
```

Generates a standup-ready report with yesterday's work, today's progress, and potential blockers.

### Weekly Recap

```bash
devlog week
```

Provides a weekly overview grouped by day with AI highlights.

### Release Notes

```bash
devlog release
```

Generates categorized release notes from all commits since the last git tag.

### Custom Range Recap

```bash
devlog recap HEAD~10..HEAD
devlog recap abc123..def456
```

Summarizes any arbitrary commit range.

### Check Status

```bash
devlog status
```

Verifies your setup: git repo, branch, author, and Copilot CLI availability.

### Initialize Config

```bash
devlog init
```

Creates a `.devlogrc` configuration file in your project.

## Options

All commands support these flags:

| Flag | Description |
|------|-------------|
| `-o, --output <file>` | Save output as a Markdown file |
| `--json` | Output structured JSON |
| `--no-ai` | Skip AI summarization (show raw commits only) |

### Examples

```bash
# Save today's journal as markdown
devlog today -o journal.md

# Get JSON output for automation
devlog week --json > weekly-report.json

# Quick commit list without AI
devlog today --no-ai
```

## Configuration

Create a `.devlogrc` file in your project root or home directory:

```json
{
  "format": "terminal",
  "useCopilot": true,
  "showFiles": true,
  "showStats": true,
  "maxCommits": 100
}
```

Generate a starter config with:

```bash
devlog init
```

## How It Works

1. **Git Parsing** — devlog reads your git log, extracting commits, diffs, and file changes using `simple-git`
2. **Copilot CLI Integration** — Commit data is formatted into natural language prompts and sent to `gh copilot explain` for AI-powered summarization
3. **Smart Categorization** — Copilot CLI categorizes commits into features, fixes, refactors, docs, etc.
4. **Beautiful Output** — Results are rendered with rich terminal formatting using `chalk` and `boxen`
5. **Export** — Optionally save as Markdown files or JSON for integration with other tools

### Copilot CLI Integration Details

devlog uses GitHub Copilot CLI in several ways:

- **`gh copilot explain`** — Generates natural language summaries from commit data
- **Commit categorization** — AI-powered classification of commit types
- **Standup generation** — Intelligent yesterday/today/blockers formatting
- **Release note authoring** — Categorized changelogs with context-aware descriptions

When Copilot CLI is not available, devlog falls back to local keyword-based summarization.

## Tech Stack

- **TypeScript** — Type-safe codebase
- **Commander.js** — CLI argument parsing
- **simple-git** — Git log parsing
- **chalk + boxen** — Terminal UI
- **ora** — Loading spinners
- **date-fns** — Date manipulation
- **GitHub Copilot CLI** — AI-powered summarization

## License

MIT License — see [LICENSE](LICENSE) for details.

## Built with GitHub Copilot CLI

This project was built as part of the [GitHub Copilot CLI Challenge](https://dev.to/challenges/github-2026-01-21) on DEV Community. GitHub Copilot CLI was used extensively throughout the development process for code generation, debugging, and the core AI summarization features.
