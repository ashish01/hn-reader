import { useState, useEffect } from 'react';
import { Item } from '../types';
import { getVisitedStories } from '../utils/visitedStories';
import useMaxItemListener from './useMaxItemListener';

const VISITED_STORIES_KEY = 'hn-visited-stories';
const MAX_ITEMS_DISPLAYED = 200; // Limit to prevent memory issues

export const useLiveStories = () => {
  const [items, setItems] = useState<Item[]>([]);
  const { newItems, error, loading } = useMaxItemListener();

  // Add new items to the top of the list
  useEffect(() => {
    if (newItems.length > 0) {
      setItems((prevItems) => {
        // Get visited stories
        const visitedIds = getVisitedStories();

        // Mark stories as visited if they're in the visited list
        const markedNewItems = newItems.map(item => {
          if (item.type === 'story' && visitedIds.includes(item.id)) {
            return { ...item, visited: true };
          }
          return item;
        });

        // Combine new items with existing ones
        const combined = [...markedNewItems, ...prevItems];

        // Limit total number of items to prevent memory issues
        return combined.slice(0, MAX_ITEMS_DISPLAYED);
      });
    }
  }, [newItems]);

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
  };
};

export default useLiveStories;
