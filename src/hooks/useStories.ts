import { useState, useEffect, useCallback } from 'react';
import { getTopStories, getStory } from '../api/hackernews';
import { Story } from '../types';

// Keys for localStorage
const PINNED_STORIES_KEY = 'hn-pinned-stories';
const VISITED_STORIES_KEY = 'hn-visited-stories';

// Helper function to get pinned stories from localStorage
const getPinnedStories = (): Record<number, Story> => {
  try {
    const pinnedString = localStorage.getItem(PINNED_STORIES_KEY);
    return pinnedString ? JSON.parse(pinnedString) : {};
  } catch (e) {
    console.error('Error reading pinned stories from localStorage:', e);
    return {};
  }
};

// Helper function to get visited stories from localStorage
const getVisitedStories = (): number[] => {
  try {
    const visitedString = localStorage.getItem(VISITED_STORIES_KEY);
    return visitedString ? JSON.parse(visitedString) : [];
  } catch (e) {
    console.error('Error reading visited stories from localStorage:', e);
    return [];
  }
};

// Helper function to save pinned stories to localStorage
export const savePinnedStory = (story: Story): void => {
  try {
    const pinnedStories = getPinnedStories();
    pinnedStories[story.id] = { ...story, pinned: true };
    localStorage.setItem(PINNED_STORIES_KEY, JSON.stringify(pinnedStories));
  } catch (e) {
    console.error('Error saving pinned story to localStorage:', e);
  }
};

// Helper function to remove a pinned story
export const unpinStory = (storyId: number): void => {
  try {
    const pinnedStories = getPinnedStories();
    delete pinnedStories[storyId];
    localStorage.setItem(PINNED_STORIES_KEY, JSON.stringify(pinnedStories));
  } catch (e) {
    console.error('Error removing pinned story from localStorage:', e);
  }
};

// Helper function to save visited story
export const markStoryAsVisited = (storyId: number): void => {
  try {
    const visitedStories = getVisitedStories();
    if (!visitedStories.includes(storyId)) {
      visitedStories.push(storyId);
      localStorage.setItem(VISITED_STORIES_KEY, JSON.stringify(visitedStories));
    }
  } catch (e) {
    console.error('Error saving visited story to localStorage:', e);
  }
};

export const useStories = (page: number = 0, itemsPerPage: number = 30) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalStories, setTotalStories] = useState<number>(0);
  const [pinnedStories, setPinnedStories] = useState<Story[]>([]);
  
  // Effect to load pinned stories from localStorage
  useEffect(() => {
    const loadPinnedStories = () => {
      const pinnedStoriesObj = getPinnedStories();
      const pinnedStoriesArray = Object.values(pinnedStoriesObj);
      setPinnedStories(pinnedStoriesArray);
    };
    
    // Function to update visited status of all stories
    const updateVisitedStatus = () => {
      const visitedIds = getVisitedStories();
      setStories(prevStories => {
        return prevStories.map(story => {
          if (story && visitedIds.includes(story.id) && !story.visited) {
            return { ...story, visited: true };
          }
          return story;
        });
      });
    };
    
    loadPinnedStories();
    
    // Listen for changes to localStorage for pinned stories or visited stories
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === PINNED_STORIES_KEY) {
        loadPinnedStories();
      } else if (e.key === VISITED_STORIES_KEY) {
        updateVisitedStatus();
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  useEffect(() => {
    let isMounted = true;
    
    const fetchStories = async () => {
      try {
        setLoading(true);
        setStories([]); // Clear previous stories
        
        // Get all story IDs first
        const allStoryIds = await getTopStories(500); // Get a larger set to support pagination
        
        if (!isMounted) return;
        setTotalStories(allStoryIds.length);
        
        // Get pinned story IDs to exclude them from regular pagination
        const pinnedStoriesObj = getPinnedStories();
        const pinnedIds = Object.keys(pinnedStoriesObj).map(id => parseInt(id, 10));
        
        // Filter out pinned stories from the IDs we'll fetch
        const unpinnedStoryIds = allStoryIds.filter(id => !pinnedIds.includes(id));
        
        // Calculate pagination only on the unpinned stories
        const startIndex = page * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedIds = unpinnedStoryIds.slice(startIndex, endIndex);
        
        // Get visited stories from localStorage
        const visitedIds = getVisitedStories();
        
        // Fetch each story individually and update the state incrementally
        const storyPromises = paginatedIds.map(async (id, index) => {
          try {
            const story = await getStory(id);
            
            if (!isMounted) return;
            
            // Mark story as visited if it's in the visited list
            if (visitedIds.includes(id)) {
              story.visited = true;
            }
            
            setStories(prevStories => {
              // Create a new array with the story inserted at the correct index
              const newStories = [...prevStories];
              newStories[index] = story;
              return newStories;
            });
            
            return story;
          } catch (err) {
            console.error(`Error fetching story ${id}:`, err);
            return null;
          }
        });
        
        // Wait for all stories to complete
        await Promise.all(storyPromises);
        
        if (!isMounted) return;
        setLoading(false);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err : new Error('An error occurred'));
        setLoading(false);
      }
    };

    fetchStories();
    
    return () => {
      isMounted = false;
    };
  }, [page, itemsPerPage]);

  // Sort the stories by their position in the original array
  // and add pinned stories at the top
  const sortedStories = useCallback(() => {
    // Filter out null stories from regular stories
    const validStories = stories.filter(Boolean);
    
    // Return pinned stories first, then regular stories
    // (We've already excluded pinned stories from the main fetch)
    return [...pinnedStories, ...validStories];
  }, [stories, pinnedStories]);

  // Calculate the total number of unpinned stories for pagination
  const unpinnedCount = totalStories - pinnedStories.length;
  
  return { 
    stories: sortedStories(), 
    pinnedStories,
    loading, 
    error, 
    totalStories: unpinnedCount, // Use only unpinned count for total
    totalPages: Math.ceil(unpinnedCount / itemsPerPage),
    currentPage: page,
    togglePinned: (story: Story) => {
      if (story.pinned) {
        unpinStory(story.id);
      } else {
        savePinnedStory(story);
      }
    }
  };
};

export default useStories;