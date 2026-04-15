// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { RunnerEvent, ScenarioResult, TestScenario } from "../../packages/test-harness/src";
import App from "./App";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}

const { runScenarioMock, scenarios, registry } = vi.hoisted(() => {
  const scenarios: TestScenario[] = [
    {
      id: "app-shell-startup",
      title: "App shell starts with editor window visible",
      summary: "Starts the shell and waits for the empty workspace.",
      surface: "editor",
      tags: ["smoke", "editor"],
      steps: [
        { id: "launch-dev-shell", title: "Launch shell", kind: "setup" },
        { id: "wait-for-empty-workspace", title: "Wait for empty workspace", kind: "assertion" },
        { id: "close-shell", title: "Close shell", kind: "teardown" }
      ]
    },
    {
      id: "open-markdown-file-basic",
      title: "Open a Markdown file via File > Open",
      summary: "Opens a fixture and verifies editor content.",
      surface: "editor",
      tags: ["smoke", "editor", "file-io"],
      steps: [
        { id: "launch-dev-shell", title: "Launch shell", kind: "setup" },
        { id: "invoke-open-command", title: "Invoke File > Open", kind: "action" },
        { id: "select-fixture", title: "Select fixture", kind: "action" }
      ]
    }
  ];

  const registry = {
    register: vi.fn(),
    registerAll: vi.fn(),
    list: vi.fn(() => scenarios),
    get: vi.fn((id: string) => scenarios.find((scenario) => scenario.id === id) ?? null),
    has: vi.fn((id: string) => scenarios.some((scenario) => scenario.id === id)),
    getTags: vi.fn(() => ["editor", "file-io", "smoke"]),
    getSurfaces: vi.fn(() => ["editor"]),
    size: vi.fn(() => scenarios.length)
  };

  return {
    runScenarioMock: vi.fn(),
    scenarios,
    registry
  };
});

vi.mock("../../packages/test-harness/src", async () => {
  const actual =
    await vi.importActual<typeof import("../../packages/test-harness/src")>(
      "../../packages/test-harness/src"
    );

  return {
    ...actual,
    defaultScenarioRegistry: registry,
    runScenario: runScenarioMock
  };
});

function createScenarioResult(
  scenario: TestScenario,
  overrides: Partial<ScenarioResult> = {}
): ScenarioResult {
  return {
    scenarioId: scenario.id,
    status: "passed",
    startedAt: 100,
    finishedAt: 160,
    durationMs: 60,
    steps: scenario.steps.map((step, index) => ({
      id: step.id,
      status: "passed",
      startedAt: 100 + index * 20,
      finishedAt: 120 + index * 20,
      durationMs: 20
    })),
    ...overrides
  };
}

describe("Test workbench shell", () => {
  let container: HTMLDivElement;
  let root: Root;
  let openEditorTestWindow: ReturnType<typeof vi.fn<() => Promise<void>>>;

  beforeEach(() => {
    globalThis.IS_REACT_ACT_ENVIRONMENT = true;
    window.history.replaceState({}, "", "/?mode=test-workbench");
    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
    openEditorTestWindow = vi.fn<() => Promise<void>>().mockResolvedValue();
    runScenarioMock.mockReset();

    window.yulora = {
      platform: "win32",
      runtimeMode: "test-workbench",
      openMarkdownFile: vi.fn(),
      saveMarkdownFile: vi.fn(),
      saveMarkdownFileAs: vi.fn(),
      openEditorTestWindow,
      onMenuCommand: vi.fn(() => () => {})
    } as Window["yulora"];
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });

    container.remove();
    window.history.replaceState({}, "", "/");
    globalThis.IS_REACT_ACT_ENVIRONMENT = false;
  });

  it("renders the test workbench panels instead of the editor shell", async () => {
    await act(async () => {
      root.render(createElement(App));
    });

    expect(container.textContent).toContain("Yulora Test Workbench");
    expect(container.textContent).toContain("Scenario Catalog");
    expect(container.textContent).toContain("Debug Stream");
    expect(container.textContent).toContain("Test Process");
    expect(container.textContent).toContain("registered scenario");
    expect(container.textContent).toContain("app-shell-startup");
    expect(container.textContent).toContain("open-markdown-file-basic");
    expect(container.textContent).toContain("Idle");
    expect(container.textContent).toContain("No events yet");
  });

  it("shows scenario detail for the selected scenario", async () => {
    await act(async () => {
      root.render(createElement(App));
    });

    const items = container.querySelectorAll<HTMLButtonElement>(".scenario-list-item");
    expect(items.length).toBeGreaterThanOrEqual(2);

    await act(async () => {
      items[1]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const detail = container.querySelector(".scenario-detail");
    expect(detail?.textContent).toContain("Open a Markdown file via File > Open");
    expect(detail?.textContent).toContain("Invoke File > Open");
    expect(detail?.textContent).toContain("open-markdown-file-basic");
  });

  it("shows running debug state and live events while a scenario is in progress", async () => {
    let finishRun: (() => void) | null = null;

    runScenarioMock.mockImplementation(
      async (scenario: TestScenario, options: { onEvent?: (event: RunnerEvent) => void }) => {
        options.onEvent?.({ type: "scenario-start", scenarioId: scenario.id, at: 100 });
        options.onEvent?.({
          type: "step-start",
          scenarioId: scenario.id,
          stepId: scenario.steps[0]!.id,
          at: 110
        });

        await new Promise<void>((resolve) => {
          finishRun = resolve;
        });

        return createScenarioResult(scenario);
      }
    );

    await act(async () => {
      root.render(createElement(App));
    });

    const runButton = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.includes("Run Selected Scenario")
    );

    await act(async () => {
      runButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Running");
    expect(container.textContent).toContain("Current step");
    expect(container.textContent).toContain("launch-dev-shell");
    expect(container.textContent).toContain("scenario-start");
    expect(container.textContent).toContain("step-start");

    await act(async () => {
      finishRun?.();
      await Promise.resolve();
    });
  });

  it("shows the failed step and error message when a run fails", async () => {
    runScenarioMock.mockImplementation(
      async (scenario: TestScenario, options: { onEvent?: (event: RunnerEvent) => void }) => {
        options.onEvent?.({ type: "scenario-start", scenarioId: scenario.id, at: 100 });
        options.onEvent?.({
          type: "step-start",
          scenarioId: scenario.id,
          stepId: scenario.steps[0]!.id,
          at: 110
        });
        options.onEvent?.({
          type: "step-end",
          scenarioId: scenario.id,
          stepId: scenario.steps[0]!.id,
          status: "failed",
          at: 125,
          durationMs: 15,
          error: { message: "boom", kind: "step" }
        });
        options.onEvent?.({
          type: "scenario-end",
          scenarioId: scenario.id,
          status: "failed",
          at: 125,
          error: { message: "boom", kind: "step", stepId: scenario.steps[0]!.id }
        });

        return createScenarioResult(scenario, {
          status: "failed",
          finishedAt: 125,
          durationMs: 25,
          steps: [
            {
              id: scenario.steps[0]!.id,
              status: "failed",
              startedAt: 110,
              finishedAt: 125,
              durationMs: 15,
              error: { message: "boom", kind: "step" }
            },
            ...scenario.steps.slice(1).map((step) => ({ id: step.id, status: "skipped" as const }))
          ],
          error: { message: "boom", kind: "step", stepId: scenario.steps[0]!.id }
        });
      }
    );

    await act(async () => {
      root.render(createElement(App));
    });

    const runButton = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.includes("Run Selected Scenario")
    );

    await act(async () => {
      runButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Failed");
    expect(container.textContent).toContain("launch-dev-shell");
    expect(container.textContent).toContain("boom");
    expect(container.textContent).toContain("step");
  });

  it("shows interrupted status and abort reason when the run is aborted", async () => {
    runScenarioMock.mockImplementation(
      async (scenario: TestScenario, options: { onEvent?: (event: RunnerEvent) => void }) => {
        options.onEvent?.({ type: "scenario-start", scenarioId: scenario.id, at: 100 });
        options.onEvent?.({
          type: "step-start",
          scenarioId: scenario.id,
          stepId: scenario.steps[1]!.id,
          at: 120
        });
        options.onEvent?.({
          type: "scenario-end",
          scenarioId: scenario.id,
          status: "interrupted",
          at: 140,
          error: {
            message: "Step invoke-open-command aborted by external signal.",
            kind: "abort",
            stepId: scenario.steps[1]!.id
          }
        });

        return createScenarioResult(scenario, {
          status: "interrupted",
          finishedAt: 140,
          durationMs: 40,
          steps: [
            { id: scenario.steps[0]!.id, status: "passed", startedAt: 100, finishedAt: 120, durationMs: 20 },
            {
              id: scenario.steps[1]!.id,
              status: "skipped",
              startedAt: 120,
              finishedAt: 140,
              durationMs: 20,
              error: { message: "Step invoke-open-command aborted by external signal.", kind: "abort" }
            },
            { id: scenario.steps[2]!.id, status: "skipped" }
          ],
          error: {
            message: "Step invoke-open-command aborted by external signal.",
            kind: "abort",
            stepId: scenario.steps[1]!.id
          }
        });
      }
    );

    await act(async () => {
      root.render(createElement(App));
    });

    const items = container.querySelectorAll<HTMLButtonElement>(".scenario-list-item");
    await act(async () => {
      items[1]!.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    const runButton = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.includes("Run Selected Scenario")
    );

    await act(async () => {
      runButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(container.textContent).toContain("Interrupted");
    expect(container.textContent).toContain("invoke-open-command");
    expect(container.textContent).toContain("abort");
  });

  it("requests a dedicated editor window when the launch button is clicked", async () => {
    runScenarioMock.mockResolvedValue(createScenarioResult(scenarios[0]!));

    await act(async () => {
      root.render(createElement(App));
    });

    const launchButton = Array.from(container.querySelectorAll<HTMLButtonElement>("button")).find(
      (button) => button.textContent?.includes("Open Editor Test Window")
    );

    expect(launchButton?.textContent).toContain("Open Editor Test Window");

    await act(async () => {
      launchButton?.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      await Promise.resolve();
    });

    expect(openEditorTestWindow).toHaveBeenCalledTimes(1);
  });

  it("shows a diagnostic banner instead of crashing when the bridge is unavailable", async () => {
    // @ts-expect-error test intentionally removes the preload bridge
    delete window.yulora;

    await act(async () => {
      root.render(createElement(App));
    });

    expect(container.textContent).toContain("Yulora Test Workbench");
    expect(container.textContent).toContain("bridge unavailable");
  });
});
