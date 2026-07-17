import { z } from 'zod';
import { create } from 'zustand';
import type { DashboardFilters } from './dashboardStore';

const filtersSchema = z.object({
  focusMall: z.string().min(1),
  category: z.string().min(1),
  metric: z.enum(['absolute', 'share', 'density']),
  activePage: z.enum(['overview', 'comparability', 'categories', 'brands', 'upcoming', 'quality', 'history']),
  peerGroup: z.enum(['same-class', 'all', 'custom']),
  selectedMalls: z.array(z.string()),
  cities: z.array(z.string()),
  sourceQualities: z.array(z.enum(['Высокая', 'Средняя', 'Низкая'])),
  gapN: z.number().int().positive(),
  glaMin: z.number().finite().nullable(),
  glaMax: z.number().finite().nullable(),
  gbaMin: z.number().finite().nullable(),
  gbaMax: z.number().finite().nullable(),
  hideSmallCategories: z.boolean(),
});

const savedViewSchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  createdAt: z.string().datetime(),
  snapshotDate: z.string().min(1),
  filters: filtersSchema,
  schemaVersion: z.literal(1),
});

export interface SavedView {
  id: string;
  name: string;
  createdAt: string;
  snapshotDate: string;
  filters: DashboardFilters;
  schemaVersion: 1;
}

interface SavedViewState {
  views: SavedView[];
  save: (view: SavedView) => void;
  remove: (id: string) => void;
  rename: (id: string, name: string) => void;
  duplicate: (id: string) => SavedView | null;
}

const storageKey = 'tenant-mix-saved-views';

export function parseSavedViews(value: unknown): SavedView[] {
  const parsed = z.array(savedViewSchema).parse(Array.isArray(value) ? value : [value]);
  return parsed as SavedView[];
}

function load(): SavedView[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    return parseSavedViews(JSON.parse(localStorage.getItem(storageKey) ?? '[]'));
  } catch {
    return [];
  }
}

function persist(views: SavedView[]) {
  if (typeof localStorage !== 'undefined') localStorage.setItem(storageKey, JSON.stringify(views));
}

export const useSavedViewStore = create<SavedViewState>((set, get) => ({
  views: load(),
  save: (view) => set((state) => {
    const views = [...state.views.filter((item) => item.id !== view.id), view];
    persist(views);
    return { views };
  }),
  remove: (id) => set((state) => {
    const views = state.views.filter((item) => item.id !== id);
    persist(views);
    return { views };
  }),
  rename: (id, name) => set((state) => {
    const cleanName = name.trim();
    if (!cleanName) return state;
    const views = state.views.map((item) => item.id === id ? { ...item, name: cleanName } : item);
    persist(views);
    return { views };
  }),
  duplicate: (id) => {
    const source = get().views.find((item) => item.id === id);
    if (!source) return null;
    const copy: SavedView = {
      ...source,
      id: crypto.randomUUID(),
      name: `${source.name} — копия`,
      createdAt: new Date().toISOString(),
      filters: { ...source.filters, selectedMalls: [...source.filters.selectedMalls], cities: [...source.filters.cities], sourceQualities: [...source.filters.sourceQualities] },
    };
    get().save(copy);
    return copy;
  },
}));
