import { create } from 'zustand';

export interface SavedScenario { id: string; name: string; focusMallId: string; createdAt: string; dataSnapshot: string; addedBrandIds: string[]; removedBrandIds: string[]; schemaVersion: number }
interface ScenarioState { scenarios: SavedScenario[]; save: (scenario: SavedScenario) => void; remove: (id: string) => void }
const load = (): SavedScenario[] => { try { return JSON.parse(localStorage.getItem('tenant-mix-scenarios') ?? '[]') as SavedScenario[]; } catch { return []; } };
const persist = (scenarios: SavedScenario[]) => localStorage.setItem('tenant-mix-scenarios', JSON.stringify(scenarios));
export const useScenarioStore = create<ScenarioState>((set) => ({ scenarios: load(), save: (scenario) => set((state) => { const scenarios = [...state.scenarios.filter((item) => item.id !== scenario.id), scenario]; persist(scenarios); return { scenarios }; }), remove: (id) => set((state) => { const scenarios = state.scenarios.filter((item) => item.id !== id); persist(scenarios); return { scenarios }; }) }));
