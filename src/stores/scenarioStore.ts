import { z } from 'zod';
import { create } from 'zustand';

const scenarioSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  focusMallId: z.string().min(1),
  createdAt: z.string().datetime(),
  dataSnapshot: z.string().min(1),
  addedBrandIds: z.array(z.string()),
  removedBrandIds: z.array(z.string()),
  schemaVersion: z.literal(1),
});

export type SavedScenario = z.infer<typeof scenarioSchema>;

interface ScenarioState {
  scenarios: SavedScenario[];
  save: (scenario: SavedScenario) => void;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
  duplicate: (id: string) => SavedScenario | null;
  importMany: (value: unknown) => SavedScenario[];
}

const storageKey = 'tenant-mix-scenarios';

function readStorage(): SavedScenario[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return z.array(scenarioSchema).parse(JSON.parse(localStorage.getItem(storageKey) ?? '[]'));
  } catch {
    return [];
  }
}

function persist(scenarios: SavedScenario[]) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(scenarios));
}

export function parseScenarioImport(value: unknown): SavedScenario[] {
  const candidates = Array.isArray(value) ? value : [value];
  return z.array(scenarioSchema).parse(candidates);
}

export const useScenarioStore = create<ScenarioState>((set, get) => ({
  scenarios: readStorage(),
  save: (scenario) => set((state) => {
    const scenarios = [...state.scenarios.filter((item) => item.id !== scenario.id), scenario];
    persist(scenarios);
    return { scenarios };
  }),
  remove: (id) => set((state) => {
    const scenarios = state.scenarios.filter((item) => item.id !== id);
    persist(scenarios);
    return { scenarios };
  }),
  rename: (id, name) => set((state) => {
    const cleanName = name.trim();
    if (!cleanName) return state;
    const scenarios = state.scenarios.map((item) => item.id === id ? { ...item, name: cleanName } : item);
    persist(scenarios);
    return { scenarios };
  }),
  duplicate: (id) => {
    const source = get().scenarios.find((item) => item.id === id);
    if (!source) return null;
    const scenario = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} — копия`,
      createdAt: new Date().toISOString(),
    };
    get().save(scenario);
    return scenario;
  },
  importMany: (value) => {
    const imported = parseScenarioImport(value);
    set((state) => {
      const ids = new Set(imported.map((item) => item.id));
      const scenarios = [...state.scenarios.filter((item) => !ids.has(item.id)), ...imported];
      persist(scenarios);
      return { scenarios };
    });
    return imported;
  },
}));
