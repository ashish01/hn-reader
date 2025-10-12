import { useState, useEffect, useRef } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebase';
import { getItemsBatch } from '../api/hackernews';
import { Item } from '../types';

const MAX_DELTA_LIMIT = 50; // Limit items to check if delta is too large
const INITIAL_ITEMS_TO_FETCH = 30; // Number of items to fetch on initial load

export const useMaxItemListener = () => {
  const [newItems, setNewItems] = useState<Item[]>([]);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
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

        // Initialize on first load - fetch recent stories
        if (!isInitialized.current) {
          prevMaxId.current = newMaxId;
          isInitialized.current = true;

          try {
            setLoading(true);
            // Fetch the last N items to populate initial feed
            const idsToFetch: number[] = [];
            for (let id = newMaxId; id > newMaxId - INITIAL_ITEMS_TO_FETCH; id--) {
              idsToFetch.push(id);
            }

            const items = await getItemsBatch(idsToFetch);

            // Set all items (stories, comments, jobs, polls, etc.)
            setNewItems(items);
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

            // Update state with new items (all types, reverse to show newest first)
            if (items.length > 0) {
              setNewItems((prev) => [...items.reverse(), ...prev]);
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
    newItems,
    error,
    loading,
  };
};

export default useMaxItemListener;
