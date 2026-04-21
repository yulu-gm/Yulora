import type { RunnerEvent, ScenarioStatus } from "../runner";

export const CLI_STREAM_EVENT_PREFIX = "__FISHMARK_EVENT__";
export const CLI_STREAM_TERMINAL_PREFIX = "__FISHMARK_TERMINAL__";

type StreamEnv = {
  FISHMARK_CLI_STREAM_EVENTS?: string;
  FISHMARK_RUN_ID?: string;
};

export function buildStreamedEventLine(
  env: StreamEnv,
  event: RunnerEvent
): string | null {
  if (env.FISHMARK_CLI_STREAM_EVENTS !== "1" || !env.FISHMARK_RUN_ID) {
    return null;
  }

  return `${CLI_STREAM_EVENT_PREFIX}${JSON.stringify({
    runId: env.FISHMARK_RUN_ID,
    event
  })}`;
}

export function buildStreamedTerminalLine(
  env: StreamEnv,
  terminal: {
    exitCode: number;
    status: ScenarioStatus;
    resultPath?: string;
    stepTracePath?: string;
    error?: {
      message: string;
      kind?: string;
      stepId?: string;
    };
  }
): string | null {
  if (env.FISHMARK_CLI_STREAM_EVENTS !== "1" || !env.FISHMARK_RUN_ID) {
    return null;
  }

  return `${CLI_STREAM_TERMINAL_PREFIX}${JSON.stringify({
    runId: env.FISHMARK_RUN_ID,
    ...terminal
  })}`;
}
