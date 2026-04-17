declare module "../../scripts/build-win-release.mjs" {
  export function loadReleaseNotes(input: {
    projectDir: string;
    version: string;
  }): Promise<{
    version: string;
    title: string;
    body: string;
  }>;

  export function buildWindowsArtifacts(input: {
    projectDir: string;
    builderConfig: Record<string, unknown>;
    electronBuilderBuildImpl?: (options: unknown) => Promise<unknown>;
    platformPackagerClass?: {
      prototype: {
        pack: (...args: unknown[]) => Promise<void> | void;
      };
    };
    preparePackagedAppImpl?: (input: {
      appOutDir: string;
      builderConfig: Record<string, unknown>;
    }) => Promise<void>;
  }): Promise<void>;

  export function preparePackagedWindowsApp(input: {
    appOutDir: string;
    builderConfig: Record<string, unknown>;
    patchExecutableIconImpl?: (input: unknown) => Promise<void>;
  }): Promise<void>;

  export function writeAppUpdateMetadata(input: {
    appOutDir: string;
    builderConfig: Record<string, unknown>;
  }): Promise<void>;

  export function writeLatestReleaseMetadata(input: {
    projectDir: string;
    version: string;
  }): Promise<void>;

  export function ensureRelease(input: {
    owner: string;
    repo: string;
    version: string;
    token: string;
    releaseNotes: {
      version: string;
      title: string;
      body: string;
    };
  }): Promise<{
    html_url?: string;
    upload_url?: string;
    assets?: Array<{ id: number; name: string }>;
  }>;
}
