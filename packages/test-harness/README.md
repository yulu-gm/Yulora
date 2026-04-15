# @yulora/test-harness

Static scenario registry and (eventually) runner for the Yulora test workbench.

## Scope

- **TASK-026 (current)**: scenario and step metadata model, static registry, query API, seed scenarios.
- **TASK-027**: step state machine and unified runner.
- **TASK-028 / TASK-029 / TASK-030**: debug surface, CLI, visual-test support.

## Layout

- `src/scenario.ts` — `TestScenario`, `TestStep` types and validation helpers.
- `src/registry.ts` — `createScenarioRegistry()` factory with insertion-ordered list, tag / surface / search filtering, and id uniqueness enforcement.
- `src/scenarios/` — first-party seed scenarios (`app-shell-startup`, `open-markdown-file-basic`).
- `src/index.ts` — public entry point, exports `defaultScenarioRegistry` pre-seeded with the first-party scenarios.

## Contract

- Scenario ids and step ids are kebab-case (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`).
- The registry enforces id uniqueness at registration time.
- Scenarios are returned in insertion order, which matches the workbench list order.
- Tags are a closed union in `ScenarioTag` — adding a new tag is a deliberate code change.

The workbench UI and the agent CLI must both consume `defaultScenarioRegistry` so the two surfaces always see the same scenario list.
