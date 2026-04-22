import type { EditorTestCommandEnvelope, EditorTestCommandResultEnvelope } from "./editor-test-command";
import type { RunnerEventEnvelope, ScenarioRunTerminal } from "./test-run-session";

export interface TestBridge {
  openEditorTestWindow: () => Promise<void>;
  startScenarioRun: (input: { scenarioId: string }) => Promise<{ runId: string }>;
  interruptScenarioRun: (input: { runId: string }) => Promise<void>;
  onScenarioRunEvent: (listener: (payload: RunnerEventEnvelope) => void) => () => void;
  onScenarioRunTerminal: (listener: (payload: ScenarioRunTerminal) => void) => () => void;
  onEditorTestCommand: (listener: (payload: EditorTestCommandEnvelope) => void) => () => void;
  completeEditorTestCommand: (payload: EditorTestCommandResultEnvelope) => Promise<void>;
}
