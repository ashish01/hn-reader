import { useState, useEffect, useCallback } from 'react';
import { getTopStories, getStory } from '../api/hackernews';
import { Story } from '../types';
import { getVisitedStories } from '../utils/visitedStories';
import { STORIES_PER_PAGE, TOTAL_STORIES_TO_FETCH } from '../utils/constants';

const VISITED_STORIES_KEY = 'hn-visited-stories';

export const useStories = (page: number = 0, itemsPerPage: number = STORIES_PER_PAGE) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalStories, setTotalStories] = useState<number>(0);

  // Effect to update visited status
  useEffect(() => {
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
  
  useEffect(() => {
    let isMounted = true;

    const fetchStories = async () => {
      try {
        setLoading(true);
        setStories([]); // Clear previous stories

        // Get all story IDs first
        const allStoryIds = await getTopStories(TOTAL_STORIES_TO_FETCH); // Get a larger set to support pagination

        if (!isMounted) return;
        setTotalStories(allStoryIds.length);

        // Calculate pagination
        const startIndex = page * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedIds = allStoryIds.slice(startIndex, endIndex);
        
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

  const sortedStories = useCallback(() => {
    // Filter out null stories
    return stories.filter(Boolean);
  }, [stories]);

  return {
    stories: sortedStories(),
    loading,
    error,
    totalStories,
    totalPages: Math.ceil(totalStories / itemsPerPage),
    currentPage: page,
  };
};

export default useStories;