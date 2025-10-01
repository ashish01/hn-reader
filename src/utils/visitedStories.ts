const VISITED_STORIES_KEY = "hn-visited-stories";

/**
 * Get visited stories from localStorage
 */
export const getVisitedStories = (): number[] => {
  try {
    const visitedString = localStorage.getItem(VISITED_STORIES_KEY);
    return visitedString ? JSON.parse(visitedString) : [];
  } catch (e) {
    console.error("Error reading visited stories from localStorage:", e);
    return [];
  }
};

/**
 * Mark a story as visited in localStorage
 */
export const markStoryAsVisited = (storyId: number): void => {
  try {
    const visitedStories = getVisitedStories();
    if (!visitedStories.includes(storyId)) {
      visitedStories.push(storyId);
      localStorage.setItem(VISITED_STORIES_KEY, JSON.stringify(visitedStories));

      // Dispatch a storage event so other components can react to this change
      window.dispatchEvent(
        new StorageEvent("storage", {
          key: VISITED_STORIES_KEY,
        })
      );
    }
  } catch (e) {
    console.error("Error saving visited story to localStorage:", e);
  }
};
