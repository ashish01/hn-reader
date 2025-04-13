import { useState, useEffect, useCallback } from 'react';
import { getTopStories, getStory } from '../api/hackernews';
import { Story } from '../types';

export const useStories = (page: number = 0, itemsPerPage: number = 30) => {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [totalStories, setTotalStories] = useState<number>(0);

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
        
        // Calculate pagination
        const startIndex = page * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedIds = allStoryIds.slice(startIndex, endIndex);
        
        // Fetch each story individually and update the state incrementally
        const storyPromises = paginatedIds.map(async (id, index) => {
          try {
            const story = await getStory(id);
            
            if (!isMounted) return;
            
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
  // This ensures they display in the correct order even if they load out of order
  const sortedStories = useCallback(() => {
    return stories.filter(Boolean);
  }, [stories]);

  return { 
    stories: sortedStories(), 
    loading, 
    error, 
    totalStories,
    totalPages: Math.ceil(totalStories / itemsPerPage),
    currentPage: page
  };
};

export default useStories;