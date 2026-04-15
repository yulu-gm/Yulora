import type { OpenMarkdownFileResult } from "../shared/open-markdown-file";

export {};

declare global {
  interface Window {
    yulora: {
      platform: NodeJS.Platform;
      openMarkdownFile: () => Promise<OpenMarkdownFileResult>;
    };
  }
}
