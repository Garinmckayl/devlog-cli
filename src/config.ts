import fs from 'fs';
import path from 'path';
import os from 'os';

export interface DevlogConfig {
  /** Output format: 'terminal' | 'markdown' | 'json' */
  format: 'terminal' | 'markdown' | 'json';
  /** Whether to use Copilot CLI for AI summaries */
  useCopilot: boolean;
  /** Custom author name override */
  author?: string;
  /** Include file-level diffs in output */
  showFiles: boolean;
  /** Include stats section */
  showStats: boolean;
  /** Max commits to process per command */
  maxCommits: number;
}

const DEFAULT_CONFIG: DevlogConfig = {
  format: 'terminal',
  useCopilot: true,
  author: undefined,
  showFiles: true,
  showStats: true,
  maxCommits: 100,
};

/**
 * Load configuration from .devlogrc file in the current directory or home.
 */
export function loadConfig(cwd?: string): DevlogConfig {
  const searchPaths = [
    path.join(cwd || process.cwd(), '.devlogrc'),
    path.join(cwd || process.cwd(), '.devlogrc.json'),
    path.join(os.homedir(), '.devlogrc'),
    path.join(os.homedir(), '.devlogrc.json'),
  ];

  for (const configPath of searchPaths) {
    try {
      if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf-8');
        const userConfig = JSON.parse(content);
        return { ...DEFAULT_CONFIG, ...userConfig };
      }
    } catch {
      // Invalid config file, skip
    }
  }

  return DEFAULT_CONFIG;
}

/**
 * Generate a sample .devlogrc file.
 */
export function generateSampleConfig(): string {
  return JSON.stringify(
    {
      format: 'terminal',
      useCopilot: true,
      showFiles: true,
      showStats: true,
      maxCommits: 100,
    },
    null,
    2
  );
}
