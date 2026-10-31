"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createStore, useStore, type StoreApi } from "zustand";

export type Stall = { id: string; name: string; market: string; language: string };

export type DraftItem = {
  key: string;
  name: string;
  unit: string;
  priceZmw: number;
  canonicalKey: string | null;
  confidence: number;
  flagReason: string | null;
  suggestedPriceZmw: number | null;
  resolved: boolean;
};

type State = {
  stall: Stall | null;
  hydrated: boolean;
  boardId: string | null;
  photoUrl: string | null;
  draft: DraftItem[];
  setStall: (s: Stall | null) => void;
  setBoard: (boardId: string, photoUrl: string | null, items: Omit<DraftItem, "key" | "resolved">[]) => void;
  updateItem: (key: string, patch: Partial<DraftItem>) => void;
  removeItem: (key: string) => void;
  addItem: () => void;
  clearDraft: () => void;
  markHydrated: () => void;
};

const STALL_KEY = "pamsika.stall";

function makeStore() {
  return createStore<State>()((set) => ({
    stall: null,
    hydrated: false,
    boardId: null,
    photoUrl: null,
    draft: [],
    setStall: (stall) => {
      try {
        if (stall) localStorage.setItem(STALL_KEY, JSON.stringify(stall));
        else localStorage.removeItem(STALL_KEY);
      } catch {}
      set({ stall });
    },
    setBoard: (boardId, photoUrl, items) =>
      set({
        boardId,
        photoUrl,
        draft: items.map((i, n) => ({ ...i, key: `${boardId}-${n}`, resolved: !i.flagReason })),
      }),
    updateItem: (key, patch) => set((s) => ({ draft: s.draft.map((d) => (d.key === key ? { ...d, ...patch } : d)) })),
    removeItem: (key) => set((s) => ({ draft: s.draft.filter((d) => d.key !== key) })),
    addItem: () =>
      set((s) => ({
        draft: [
          ...s.draft,
          { key: `new-${Date.now()}`, name: "", unit: "", priceZmw: 0, canonicalKey: null, confidence: 1, flagReason: null, suggestedPriceZmw: null, resolved: true },
        ],
      })),
    clearDraft: () => set({ draft: [], boardId: null, photoUrl: null }),
    markHydrated: () => set({ hydrated: true }),
  }));
}

const StoreContext = createContext<StoreApi<State> | null>(null);

export function StallStoreProvider({ children }: { children: React.ReactNode }) {
  const [store] = useState(makeStore);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STALL_KEY);
      if (raw) store.setState({ stall: JSON.parse(raw) });
    } catch {}
    store.getState().markHydrated();
  }, [store]);
  return <StoreContext.Provider value={store}>{children}</StoreContext.Provider>;
}

export function useStall<T>(selector: (s: State) => T): T {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStall must be used inside StallStoreProvider");
  return useStore(store, selector);
}
