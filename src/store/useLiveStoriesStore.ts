import { create } from "zustand";
import { getItemsBatch } from "../api/hackernews";
import { Item } from "../types";

const INITIAL_ITEMS_TO_FETCH = 100;
const MARKER_DELAY_SECONDS = 30;
const MAX_DISPLAYED_ITEMS = 200;
const POLL_INTERVAL_MS = 5000;
const MARKER_TICK_MS = 1000;
const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";

interface LiveStoriesState {
  items: Item[];
  error: Error | null;
  loading: boolean;
  pendingCount: number;
  start: () => void;
  stop: () => void;
}

let prevMaxId: number | null = null;
let isInitialized = false;
let pollIntervalId: number | null = null;
let tickIntervalId: number | null = null;
let isRunning = false;
const displayedIds = new Set<number>();
const queuedById = new Map<number, Item>();

const useLiveStoriesStore = create<LiveStoriesState>((set) => {
  const resetState = () => {
    queuedById.clear();
    displayedIds.clear();
    prevMaxId = null;
    isInitialized = false;
    set({
      items: [],
      error: null,
      loading: true,
      pendingCount: 0,
    });
  };

  const normalizeItem = (item: Item) => {
    if (item.time) {
      return item;
    }
    const nowSeconds = Math.floor(Date.now() / 1000);
    return { ...item, time: nowSeconds };
  };

  const getItemTime = (item: Item) => item.time ?? 0;

  const queueItems = (items: Item[]) => {
    items.forEach((rawItem) => {
      const item = normalizeItem(rawItem);
      if (displayedIds.has(item.id) || queuedById.has(item.id)) {
        return;
      }
      queuedById.set(item.id, item);
    });
    set({ pendingCount: queuedById.size });
    flushDueItems();
  };

  const flushDueItems = () => {
    if (!isRunning) return;
    const markerTime = Math.floor(Date.now() / 1000) - MARKER_DELAY_SECONDS;
    const queuedItems = Array.from(queuedById.values()).sort((a, b) => {
      const timeDiff = getItemTime(a) - getItemTime(b);
      return timeDiff !== 0 ? timeDiff : a.id - b.id;
    });

    const dueItems: Item[] = [];
    for (const item of queuedItems) {
      if (getItemTime(item) <= markerTime) {
        dueItems.push(item);
        queuedById.delete(item.id);
      } else {
        break;
      }
    }

    if (dueItems.length === 0) {
      return;
    }

    dueItems.forEach((item) => displayedIds.add(item.id));

    set((state) => {
      const updated = [...dueItems, ...state.items];
      updated.sort((a, b) => {
        const timeDiff = getItemTime(b) - getItemTime(a);
        return timeDiff !== 0 ? timeDiff : b.id - a.id;
      });
      return { items: updated.slice(0, MAX_DISPLAYED_ITEMS) };
    });

    set({ pendingCount: queuedById.size });
  };

  const checkForNewItems = async () => {
    if (!isRunning) return;
    try {
      const response = await fetch(`${HN_API_BASE}/maxitem.json`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const newMaxId = (await response.json()) as number;
      if (!isRunning) return;

      if (!isInitialized) {
        isInitialized = true;
        prevMaxId = newMaxId;

        try {
          if (!isRunning) return;
          set({ loading: true });

          const idsToFetch: number[] = [];
          for (
            let id = newMaxId;
            id > newMaxId - INITIAL_ITEMS_TO_FETCH && id > 0;
            id--
          ) {
            idsToFetch.push(id);
          }

          const fetchedItems = await getItemsBatch(idsToFetch);
          if (!isRunning) return;
          const validItems = fetchedItems.filter((item) => item && item.id);
          queueItems(validItems);

          if (!isRunning) return;
          set({ loading: false });
        } catch (err) {
          console.error("Error fetching initial items:", err);
          if (isRunning) {
            set({
              error:
                err instanceof Error
                  ? err
                  : new Error("Failed to fetch initial items"),
              loading: false,
            });
          }
        }
        return;
      }

      if (prevMaxId && newMaxId > prevMaxId) {
        try {
          const idsToFetch: number[] = [];
          const delta = newMaxId - prevMaxId;
          const startId =
            delta > 50 ? newMaxId - 50 + 1 : prevMaxId + 1;

          for (let id = startId; id <= newMaxId; id++) {
            idsToFetch.push(id);
          }

          const fetchedItems = await getItemsBatch(idsToFetch);
          if (!isRunning) return;
          const validItems = fetchedItems.filter((item) => item && item.id);
          if (validItems.length > 0) {
            queueItems(validItems);
          }
        } catch (err) {
          console.error("Error fetching new items:", err);
          if (isRunning) {
            set({
              error:
                err instanceof Error
                  ? err
                  : new Error("Failed to fetch new items"),
            });
          }
        }
      }

      prevMaxId = newMaxId;
    } catch (err) {
      console.error("Error polling maxitem:", err);
      if (isRunning) {
        set({
          error:
            err instanceof Error
              ? err
              : new Error("Failed to poll for new items"),
        });
      }
    }
  };

  const start = () => {
    if (typeof window === "undefined") {
      return;
    }

    if (pollIntervalId !== null || tickIntervalId !== null) {
      return;
    }
    isRunning = true;
    checkForNewItems();
    pollIntervalId = window.setInterval(checkForNewItems, POLL_INTERVAL_MS);
    tickIntervalId = window.setInterval(flushDueItems, MARKER_TICK_MS);
  };

  const stop = () => {
    isRunning = false;
    if (pollIntervalId !== null) {
      clearInterval(pollIntervalId);
      pollIntervalId = null;
    }
    if (tickIntervalId !== null) {
      clearInterval(tickIntervalId);
      tickIntervalId = null;
    }
    resetState();
  };

  return {
    items: [],
    error: null,
    loading: true,
    pendingCount: 0,
    start,
    stop,
  };
});

export { MARKER_DELAY_SECONDS };
export default useLiveStoriesStore;
