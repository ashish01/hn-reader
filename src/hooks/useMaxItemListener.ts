import { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebase';
import { getItemsBatch } from '../api/hackernews';
import { Item } from '../types';

const MAX_DELTA_LIMIT = 50; // Limit items to check if delta is too large
const INITIAL_ITEMS_TO_FETCH = 100; // Number of items to fetch on initial load
const MAX_TIMELINE_BUFFER = 150; // Maximum items in timeline buffer

// Helper function to insert items in timeline sorted by timestamp
const insertItemsSorted = (timeline: Item[], newItems: Item[]): Item[] => {
  const combined = [...timeline, ...newItems];
  // Sort by time (ascending - oldest first)
  // Filter out items without time and handle undefined
  return combined
    .filter(item => item.time !== undefined)
    .sort((a, b) => (a.time || 0) - (b.time || 0));
};

export const useMaxItemListener = () => {
  const [timelineBuffer, setTimelineBuffer] = useState<Item[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [lastUpdateTime, setLastUpdateTime] = useState<number>(0);
  const prevMaxId = useRef<number | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    // Reference to the maxitem endpoint
    const maxItemRef = ref(db, 'v0/maxitem');

    // Set up the Firebase listener
    const unsubscribe = onValue(
      maxItemRef,
      async (snapshot) => {
        const newMaxId = snapshot.val() as number;
        setLastUpdateTime(Date.now());

        // Initialize on first load - fetch recent items to populate timeline
        if (!isInitialized.current) {
          prevMaxId.current = newMaxId;
          isInitialized.current = true;

          try {
            setLoading(true);
            // Fetch the last N items to populate timeline buffer
            const idsToFetch: number[] = [];
            for (let id = newMaxId; id > newMaxId - INITIAL_ITEMS_TO_FETCH; id--) {
              idsToFetch.push(id);
            }

            const items = await getItemsBatch(idsToFetch);

            // Set timeline buffer sorted by timestamp (oldest first)
            // Filter out items without time
            const itemsWithTime = items.filter(item => item.time !== undefined);
            setTimelineBuffer(itemsWithTime.sort((a, b) => (a.time || 0) - (b.time || 0)));
            setLoading(false);
          } catch (err) {
            console.error('Error fetching initial items:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch initial items'));
            setLoading(false);
          }
          return;
        }

        // Check if there are new items
        if (prevMaxId.current && newMaxId > prevMaxId.current) {
          try {
            // Calculate the range of items to check
            let startId = prevMaxId.current + 1;
            const delta = newMaxId - prevMaxId.current;

            // If delta is too large, only check the most recent items
            if (delta > MAX_DELTA_LIMIT) {
              startId = newMaxId - MAX_DELTA_LIMIT + 1;
            }

            // Generate array of IDs to fetch
            const idsToFetch: number[] = [];
            for (let id = startId; id <= newMaxId; id++) {
              idsToFetch.push(id);
            }

            // Fetch all items in parallel
            const items = await getItemsBatch(idsToFetch);

            // Add new items to timeline buffer (sorted by timestamp)
            if (items.length > 0) {
              setTimelineBuffer((prev) => {
                const updated = insertItemsSorted(prev, items);
                // Limit timeline buffer to prevent unbounded growth
                if (updated.length > MAX_TIMELINE_BUFFER) {
                  // Keep the most recent items (remove oldest)
                  return updated.slice(-MAX_TIMELINE_BUFFER);
                }
                return updated;
              });
            }
          } catch (err) {
            console.error('Error fetching new items:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch new items'));
          }
        }

        // Update the previous max ID
        prevMaxId.current = newMaxId;
      },
      (err) => {
        console.error('Firebase listener error:', err);
        setError(err instanceof Error ? err : new Error('Firebase connection error'));
      }
    );

    // Cleanup listener on unmount
    return () => {
      unsubscribe();
    };
  }, []);

  return {
    timelineBuffer,
    error,
    loading,
    lastUpdateTime,
  };
};

export default useMaxItemListener;
