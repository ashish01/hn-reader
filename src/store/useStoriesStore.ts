import { create } from "zustand";
import { getTopStories, getStory } from "../api/hackernews";
import { Story } from "../types";
import { STORIES_PER_PAGE, TOTAL_STORIES_TO_FETCH } from "../utils/constants";

interface StoriesState {
  stories: Story[];
  loading: boolean;
  error: Error | null;
  totalStories: number;
  currentPage: number;
  itemsPerPage: number;
  fetchStories: (page: number, itemsPerPage?: number) => Promise<void>;
}

let storiesRequestId = 0;

const useStoriesStore = create<StoriesState>((set) => ({
  stories: [],
  loading: true,
  error: null,
  totalStories: 0,
  currentPage: 0,
  itemsPerPage: STORIES_PER_PAGE,
  fetchStories: async (page, itemsPerPage = STORIES_PER_PAGE) => {
    const requestId = ++storiesRequestId;
    set({
      loading: true,
      error: null,
      stories: [],
      currentPage: page,
      itemsPerPage,
    });

    try {
      const allStoryIds = await getTopStories(TOTAL_STORIES_TO_FETCH);
      if (requestId !== storiesRequestId) return;

      set({ totalStories: allStoryIds.length });

      const startIndex = page * itemsPerPage;
      const endIndex = startIndex + itemsPerPage;
      const paginatedIds = allStoryIds.slice(startIndex, endIndex);

      const storyPromises = paginatedIds.map(async (id) => {
        try {
          return await getStory(id);
        } catch (err) {
          console.error(`Error fetching story ${id}:`, err);
          return null;
        }
      });

      const fetchedStories = await Promise.all(storyPromises);
      if (requestId !== storiesRequestId) return;

      const stories = fetchedStories.filter((story): story is Story => story !== null);
      set({ stories, loading: false });
    } catch (err) {
      if (requestId !== storiesRequestId) return;
      set({
        error: err instanceof Error ? err : new Error("An error occurred"),
        loading: false,
      });
    }
  },
}));

export default useStoriesStore;
