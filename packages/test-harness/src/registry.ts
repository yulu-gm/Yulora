import {
  assertValidScenario,
  type ScenarioSurface,
  type ScenarioTag,
  type TestScenario
} from "./scenario";

export type ScenarioQuery = {
  readonly tag?: ScenarioTag;
  readonly surface?: ScenarioSurface;
  /** Case-insensitive substring match against id / title / summary. */
  readonly search?: string;
};

export type ScenarioRegistry = {
  register(scenario: TestScenario): void;
  registerAll(scenarios: readonly TestScenario[]): void;
  list(query?: ScenarioQuery): readonly TestScenario[];
  get(id: string): TestScenario | null;
  has(id: string): boolean;
  getTags(): readonly ScenarioTag[];
  getSurfaces(): readonly ScenarioSurface[];
  size(): number;
};

export function createScenarioRegistry(seed: readonly TestScenario[] = []): ScenarioRegistry {
  const byId = new Map<string, TestScenario>();
  const ordered: TestScenario[] = [];

  function register(scenario: TestScenario): void {
    assertValidScenario(scenario);

    if (byId.has(scenario.id)) {
      throw new Error(`Scenario id ${JSON.stringify(scenario.id)} is already registered.`);
    }

    byId.set(scenario.id, scenario);
    ordered.push(scenario);
  }

  function registerAll(scenarios: readonly TestScenario[]): void {
    for (const scenario of scenarios) {
      register(scenario);
    }
  }

  function list(query?: ScenarioQuery): readonly TestScenario[] {
    if (!query) {
      return ordered.slice();
    }

    const search = query.search?.trim().toLowerCase();

    return ordered.filter((scenario) => {
      if (query.tag && !scenario.tags.includes(query.tag)) {
        return false;
      }

      if (query.surface && scenario.surface !== query.surface) {
        return false;
      }

      if (search) {
        const haystack = `${scenario.id} ${scenario.title} ${scenario.summary}`.toLowerCase();
        if (!haystack.includes(search)) {
          return false;
        }
      }

      return true;
    });
  }

  function get(id: string): TestScenario | null {
    return byId.get(id) ?? null;
  }

  function has(id: string): boolean {
    return byId.has(id);
  }

  function getTags(): readonly ScenarioTag[] {
    const tags = new Set<ScenarioTag>();
    for (const scenario of ordered) {
      for (const tag of scenario.tags) {
        tags.add(tag);
      }
    }
    return Array.from(tags).sort();
  }

  function getSurfaces(): readonly ScenarioSurface[] {
    const surfaces = new Set<ScenarioSurface>();
    for (const scenario of ordered) {
      surfaces.add(scenario.surface);
    }
    return Array.from(surfaces).sort();
  }

  function size(): number {
    return ordered.length;
  }

  registerAll(seed);

  return { register, registerAll, list, get, has, getTags, getSurfaces, size };
}
