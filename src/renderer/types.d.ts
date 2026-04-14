export {};

declare global {
  interface Window {
    yulora: {
      platform: NodeJS.Platform;
    };
  }
}
