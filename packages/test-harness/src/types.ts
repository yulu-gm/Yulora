/**
 * Metadata model for the static scenario registry used by the test workbench
 * and the agent-facing CLI (TASK-026).
 *
 * Everything in this file is intentionally metadata only. Actual execution
 * (step status machine, runner context, event stream) lands in TASK-027+.
 */

export type TestScenarioCategory = "smoke" | "regression" | "visual" | "manual";

export type TestStepKind = "setup" | "action" | "assertion" | "cleanup";

export type TestScenarioSurface = "editor" | "test-workbench" | "main-process";

export type TestStep = {
  /** Stable id within the scenario. Must be unique per scenario. */
  id: string;
  title: string;
  kind: TestStepKind;
  description?: string;
};

export type TestScenario = {
  /** Globally unique, stable identifier consumed by CLI, workbench, and reports. */
  id: string;
  title: string;
  description: string;
  category: TestScenarioCategory;
  surface: TestScenarioSurface;
  tags: readonly string[];
  /** Human-readable preconditions that must hold before the scenario runs. */
  prerequisites?: readonly string[];
  /** Ordered steps. Step ids must be unique within the scenario. */
  steps: readonly TestStep[];
  /** Optional backlog task ids this scenario exercises, for traceability. */
  relatedTasks?: readonly string[];
};

export type ScenarioFilter = {
  category?: TestScenarioCategory;
  surface?: TestScenarioSurface;
  tag?: string;
  /** Case-insensitive substring match over id, title, and description. */
  search?: string;
};
