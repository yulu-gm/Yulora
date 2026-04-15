import { createScenarioRegistry } from "./registry";
import { seedScenarios } from "./scenarios";

export type {
  ScenarioSurface,
  ScenarioTag,
  TestScenario,
  TestStep,
  TestStepKind
} from "./scenario";
export { assertValidScenario, isValidScenarioId } from "./scenario";

export type { ScenarioQuery, ScenarioRegistry } from "./registry";
export { createScenarioRegistry } from "./registry";

export type {
  RunContext,
  RunErrorInfo,
  RunScenarioOptions,
  RunnerEvent,
  ScenarioResult,
  ScenarioStatus,
  StepHandler,
  StepHandlerMap,
  StepResult,
  StepStatus
} from "./runner";
export { runScenario } from "./runner";

export { seedScenarios } from "./scenarios";

/**
 * Default module-level registry seeded with the first-party scenarios.
 * The workbench UI and the future agent CLI must both consume this
 * registry so they see the same scenario list without free-form scripts.
 */
export const defaultScenarioRegistry = createScenarioRegistry(seedScenarios);
