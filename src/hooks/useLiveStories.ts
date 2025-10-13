import { useState, useEffect } from 'react';
import { Item } from '../types';
import { getVisitedStories } from '../utils/visitedStories';
import useMaxItemListener from './useMaxItemListener';
import useTimelineRenderer from './useTimelineRenderer';

const VISITED_STORIES_KEY = 'hn-visited-stories';
const MAX_ITEMS_DISPLAYED = 200; // Limit to prevent memory issues

export const useLiveStories = () => {
  const [items, setItems] = useState<Item[]>([]);

  // Get timeline buffer from Firebase listener
  const { timelineBuffer, error, loading, lastUpdateTime } = useMaxItemListener();

  // Get displayed items from timeline renderer
  const { displayedItems, renderMarkerTime, timelinePending, isLive, markerGapSeconds } = useTimelineRenderer(timelineBuffer);

  // Apply visited status to displayed items directly
  useEffect(() => {
    const visitedIds = getVisitedStories();

    // Mark stories as visited if they're in the visited list
    const markedItems = displayedItems.map(item => {
      if (item.type === 'story' && visitedIds.includes(item.id)) {
        return { ...item, visited: true };
      }
      return item;
    });

    // Limit total number of items to prevent memory issues
    const limitedItems = markedItems.slice(0, MAX_ITEMS_DISPLAYED);

    setItems(limitedItems);
  }, [displayedItems]);

  // Update visited status when localStorage changes
  useEffect(() => {
    const updateVisitedStatus = () => {
      const visitedIds = getVisitedStories();
      setItems(prevItems => {
        return prevItems.map(item => {
          if (item.type === 'story' && visitedIds.includes(item.id) && !item.visited) {
            return { ...item, visited: true };
          }
          return item;
        });
      });
    };

    // Listen for changes to localStorage for visited stories
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === VISITED_STORIES_KEY) {
        updateVisitedStatus();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  return {
    items,
    error,
    loading,
    renderMarkerTime,
    timelinePending,
    isLive,
    lastUpdateTime,
    markerGapSeconds,
  };
};

export default useLiveStories;
