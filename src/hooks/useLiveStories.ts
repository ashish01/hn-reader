import { useState, useEffect, useRef, useCallback } from "react";
import { getItemsBatch } from "../api/hackernews";
import { Item } from "../types";
import { getVisitedStories } from "../utils/visitedStories";

const INITIAL_ITEMS_TO_FETCH = 100;
const DISPLAY_DELAY_MS = 10000; // 10 seconds
const MAX_DISPLAYED_ITEMS = 200;
const VISITED_STORIES_KEY = "hn-visited-stories";
const POLL_INTERVAL_MS = 2000; // Poll for new items every 2 seconds
const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";

export const useLiveStories = () => {
  const [items, setItems] = useState<Item[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);

  const prevMaxId = useRef<number | null>(null);
  const isInitialized = useRef(false);
  const scheduledTimeouts = useRef<Map<number, number>>(new Map());
  const displayedIds = useRef<Set<number>>(new Set());

  // Clean up timeouts on unmount
  useEffect(() => {
    const timeouts = scheduledTimeouts.current;
    return () => {
      timeouts.forEach((timeoutId) => clearTimeout(timeoutId));
      timeouts.clear();
    };
  }, []);

  // Update visited status when localStorage changes
  useEffect(() => {
    const updateVisitedStatus = () => {
      const visitedIds = getVisitedStories();
      setItems((prevItems) =>
        prevItems.map((item) => {
          if (
            item.type === "story" &&
            visitedIds.includes(item.id) &&
            !item.visited
          ) {
            return { ...item, visited: true };
          }
          return item;
        }),
      );
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === VISITED_STORIES_KEY) {
        updateVisitedStatus();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Update pending count
  const updateStats = () => {
    const pending = scheduledTimeouts.current.size;
    setPendingCount(pending);
  };

  // Schedule an item to be displayed
  const scheduleItem = useCallback((item: Item, delayMs: number) => {
    if (
      displayedIds.current.has(item.id) ||
      scheduledTimeouts.current.has(item.id)
    ) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      scheduledTimeouts.current.delete(item.id);
      displayedIds.current.add(item.id);

      // Apply visited status
      const visitedIds = getVisitedStories();
      const itemWithVisited =
        item.type === "story" && visitedIds.includes(item.id)
          ? { ...item, visited: true }
          : item;

      setItems((prev) => {
        const updated = [itemWithVisited, ...prev];
        // Sort by ID descending (newest first) to maintain proper order
        updated.sort((a, b) => b.id - a.id);
        return updated.slice(0, MAX_DISPLAYED_ITEMS);
      });

      updateStats();
    }, delayMs);

    scheduledTimeouts.current.set(item.id, timeoutId);
    updateStats();
  }, []);

  // Poll for new items using HN API directly
  useEffect(() => {
    const checkForNewItems = async () => {
      try {
        const response = await fetch(`${HN_API_BASE}/maxitem.json`);
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const newMaxId = (await response.json()) as number;
        setLastUpdateTime(Date.now());

        // Initial load: fetch recent items
        if (!isInitialized.current) {
          isInitialized.current = true;
          prevMaxId.current = newMaxId;

          try {
            setLoading(true);

            // Fetch the last N items
            const idsToFetch: number[] = [];
            for (
              let id = newMaxId;
              id > newMaxId - INITIAL_ITEMS_TO_FETCH && id > 0;
              id--
            ) {
              idsToFetch.push(id);
            }

            const fetchedItems = await getItemsBatch(idsToFetch);
            const validItems = fetchedItems.filter((item) => item && item.id);

            // Sort by ID descending (newest first)
            validItems.sort((a, b) => b.id - a.id);

            // Only show items from the last 10 minutes on initial load
            // This prevents old items from flashing on screen
            const now = Date.now() / 1000; // Current time in seconds
            const tenMinutesAgo = now - 10 * 60; // 10 minutes in seconds
            const recentItems = validItems.filter(
              (item) => item.time && item.time >= tenMinutesAgo,
            );

            // Stagger items to create a flow on initial load
            // Show OLDEST items immediately, queue up to 5 NEWEST items with staggered delays
            const STAGGER_DELAY_MS = 3000; // 3 seconds between items
            const ITEMS_TO_QUEUE = Math.min(5, recentItems.length); // Queue up to 5 newest items

            recentItems.forEach((item, index) => {
              if (index < ITEMS_TO_QUEUE) {
                // These are the NEWEST items (first in array) - stagger them
                const delay = (index + 1) * STAGGER_DELAY_MS;
                scheduleItem(item, delay);
              } else {
                // These are the OLDER items - show them immediately
                scheduleItem(item, 0);
              }
            });

            setLoading(false);
          } catch (err) {
            console.error("Error fetching initial items:", err);
            setError(
              err instanceof Error
                ? err
                : new Error("Failed to fetch initial items"),
            );
            setLoading(false);
          }
          return;
        }

        // Handle new items
        if (prevMaxId.current && newMaxId > prevMaxId.current) {
          try {
            const idsToFetch: number[] = [];
            const delta = newMaxId - prevMaxId.current;
            const startId =
              delta > 50 ? newMaxId - 50 + 1 : prevMaxId.current + 1;

            for (let id = startId; id <= newMaxId; id++) {
              idsToFetch.push(id);
            }

            const fetchedItems = await getItemsBatch(idsToFetch);
            const validItems = fetchedItems.filter((item) => item && item.id);

            // Schedule each new item with delay based on creation time
            // This preserves the relative timing between items for a streaming effect
            if (validItems.length > 0) {
              // Find the oldest item timestamp
              const oldestTime = Math.min(
                ...validItems.map((item) => item.time || 0),
              );

              validItems.forEach((item) => {
                if (item.time) {
                  // Calculate delay: base delay + time since oldest item
                  const relativeAge = (item.time - oldestTime) * 1000; // Convert to ms
                  const delay = DISPLAY_DELAY_MS + relativeAge;
                  scheduleItem(item, delay);
                } else {
                  // Fallback if no timestamp
                  scheduleItem(item, DISPLAY_DELAY_MS);
                }
              });
            }
          } catch (err) {
            console.error("Error fetching new items:", err);
            setError(
              err instanceof Error
                ? err
                : new Error("Failed to fetch new items"),
            );
          }
        }

        prevMaxId.current = newMaxId;
      } catch (err) {
        console.error("Error polling maxitem:", err);
        setError(
          err instanceof Error
            ? err
            : new Error("Failed to poll for new items"),
        );
      }
    };

    // Initial check
    checkForNewItems();

    // Set up polling interval
    const intervalId = setInterval(checkForNewItems, POLL_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [scheduleItem]);

  return {
    items,
    error,
    loading,
    renderMarkerTime: Math.floor((Date.now() - DISPLAY_DELAY_MS) / 1000),
    timelinePending: pendingCount,
    isLive: pendingCount === 0,
    lastUpdateTime,
    markerGapSeconds: 0, // Simplified: not tracking next item delay
    baseDelaySeconds: Math.floor(DISPLAY_DELAY_MS / 1000),
  };
};

export default useLiveStories;
