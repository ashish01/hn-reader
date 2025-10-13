import { useState, useEffect, useRef, useCallback } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '../services/firebase';
import { getItemsBatch } from '../api/hackernews';
import { Item } from '../types';
import { getVisitedStories } from '../utils/visitedStories';

const INITIAL_ITEMS_TO_FETCH = 100;
const DISPLAY_DELAY_MS = 30000; // 30 seconds
const INITIAL_STAGGER_MS = 3000; // 3 seconds between items on initial load
const MAX_DISPLAYED_ITEMS = 200;
const VISITED_STORIES_KEY = 'hn-visited-stories';

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
      timeouts.forEach(timeoutId => clearTimeout(timeoutId));
      timeouts.clear();
    };
  }, []);

  // Update visited status when localStorage changes
  useEffect(() => {
    const updateVisitedStatus = () => {
      const visitedIds = getVisitedStories();
      setItems(prevItems =>
        prevItems.map(item => {
          if (item.type === 'story' && visitedIds.includes(item.id) && !item.visited) {
            return { ...item, visited: true };
          }
          return item;
        })
      );
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === VISITED_STORIES_KEY) {
        updateVisitedStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Update pending count
  const updateStats = () => {
    const pending = scheduledTimeouts.current.size;
    setPendingCount(pending);
  };

  // Schedule an item to be displayed
  const scheduleItem = useCallback((item: Item, delayMs: number) => {
    if (displayedIds.current.has(item.id) || scheduledTimeouts.current.has(item.id)) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      scheduledTimeouts.current.delete(item.id);
      displayedIds.current.add(item.id);

      // Apply visited status
      const visitedIds = getVisitedStories();
      const itemWithVisited = item.type === 'story' && visitedIds.includes(item.id)
        ? { ...item, visited: true }
        : item;

      setItems(prev => {
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

  // Main Firebase listener
  useEffect(() => {
    const maxItemRef = ref(db, 'v0/maxitem');

    const unsubscribe = onValue(
      maxItemRef,
      async (snapshot) => {
        const newMaxId = snapshot.val() as number;
        setLastUpdateTime(Date.now());

        // Initial load: fetch recent items
        if (!isInitialized.current) {
          isInitialized.current = true;
          prevMaxId.current = newMaxId;

          try {
            setLoading(true);

            // Fetch the last N items
            const idsToFetch: number[] = [];
            for (let id = newMaxId; id > newMaxId - INITIAL_ITEMS_TO_FETCH && id > 0; id--) {
              idsToFetch.push(id);
            }

            const fetchedItems = await getItemsBatch(idsToFetch);
            const validItems = fetchedItems.filter(item => item && item.id);

            // Sort by ID descending (newest first)
            validItems.sort((a, b) => b.id - a.id);

            // Debug: Check what we're fetching
            const now = Date.now() / 1000; // Current time in seconds
            console.log('Initial load - Max ID from Firebase:', newMaxId);
            console.log('Fetching IDs from', newMaxId - INITIAL_ITEMS_TO_FETCH + 1, 'to', newMaxId);
            console.log('Valid items received:', validItems.length);

            // Show age distribution
            const ages = validItems.map(item => Math.floor((now - (item.time || 0)) / 60)); // age in minutes
            console.log('Item ages (minutes):', {
              min: Math.min(...ages),
              max: Math.max(...ages),
              avg: Math.floor(ages.reduce((a, b) => a + b, 0) / ages.length)
            });

            // Show first few items with their timestamps
            console.log('First 5 items (by ID):', validItems.slice(0, 5).map(i => ({
              id: i.id,
              type: i.type,
              ageMinutes: Math.floor((now - (i.time || 0)) / 60)
            })));

            // Schedule first half immediately, second half with stagger
            const halfPoint = Math.floor(validItems.length / 2);

            validItems.forEach((item, index) => {
              if (index < halfPoint) {
                scheduleItem(item, 0);
              } else {
                const staggerDelay = (index - halfPoint) * INITIAL_STAGGER_MS;
                scheduleItem(item, staggerDelay);
              }
            });

            setLoading(false);
          } catch (err) {
            console.error('Error fetching initial items:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch initial items'));
            setLoading(false);
          }
          return;
        }

        // Handle new items
        if (prevMaxId.current && newMaxId > prevMaxId.current) {
          try {
            const idsToFetch: number[] = [];
            const delta = newMaxId - prevMaxId.current;
            const startId = delta > 50 ? newMaxId - 50 + 1 : prevMaxId.current + 1;

            for (let id = startId; id <= newMaxId; id++) {
              idsToFetch.push(id);
            }

            const fetchedItems = await getItemsBatch(idsToFetch);
            const validItems = fetchedItems.filter(item => item && item.id);

            // Debug new items
            const now = Date.now() / 1000;
            console.log('New items arrived:', validItems.length, 'IDs:', validItems.map(i => i.id));
            if (validItems.length > 0) {
              const ages = validItems.map(item => Math.floor((now - (item.time || 0)) / 60));
              console.log('New item ages (minutes):', {
                min: Math.min(...ages),
                max: Math.max(...ages),
                items: validItems.map(i => ({ id: i.id, type: i.type, ageMin: Math.floor((now - (i.time || 0)) / 60) }))
              });
            }

            // Schedule each new item with fixed delay
            validItems.forEach(item => {
              scheduleItem(item, DISPLAY_DELAY_MS);
            });
          } catch (err) {
            console.error('Error fetching new items:', err);
            setError(err instanceof Error ? err : new Error('Failed to fetch new items'));
          }
        }

        prevMaxId.current = newMaxId;
      },
      (err) => {
        console.error('Firebase listener error:', err);
        setError(err instanceof Error ? err : new Error('Firebase connection error'));
      }
    );

    return () => unsubscribe();
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
