import { create } from "zustand";
import { getTopStories, getStory } from "../api/hackernews";
import { Story } from "../types";
import { STORIES_PER_PAGE, TOTAL_STORIES_TO_FETCH } from "../utils/constants";
import { pLimit } from "../utils/pLimit";

const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

interface StoriesState {
  stories: Story[];
  loading: boolean;
  error: Error | null;
  totalStories: number;
  currentPage: number;
  itemsPerPage: number;
  fetchStories: (page: number, itemsPerPage?: number) => Promise<void>;
}

const useStoriesStore = create<StoriesState>((set) => {
  // All mutable state inside closure — not module-level
  let requestId = 0;
  let cachedStoryIds: number[] | null = null;
  let cacheTimestamp = 0;
  let currentAbort: AbortController | null = null;

  const isCacheFresh = () =>
    cachedStoryIds !== null && Date.now() - cacheTimestamp < CACHE_TTL_MS;

  return {
    stories: [],
    loading: true,
    error: null,
    totalStories: 0,
    currentPage: 0,
    itemsPerPage: STORIES_PER_PAGE,
    fetchStories: async (page, itemsPerPage = STORIES_PER_PAGE) => {
      // Abort any in-flight request
      if (currentAbort) {
        currentAbort.abort();
      }
      const abort = new AbortController();
      currentAbort = abort;
      const thisRequest = ++requestId;

      set({
        loading: true,
        error: null,
        stories: [],
        currentPage: page,
        itemsPerPage,
      });

      try {
        let allStoryIds: number[];

        if (isCacheFresh()) {
          allStoryIds = cachedStoryIds!;
        } else {
          allStoryIds = await getTopStories(
            TOTAL_STORIES_TO_FETCH,
            abort.signal,
          );
          if (thisRequest !== requestId) return;
          cachedStoryIds = allStoryIds;
          cacheTimestamp = Date.now();
        }

        set({ totalStories: allStoryIds.length });

        const startIndex = page * itemsPerPage;
        const endIndex = startIndex + itemsPerPage;
        const paginatedIds = allStoryIds.slice(startIndex, endIndex);
        const orderedStories: Array<Story | null> = paginatedIds.map(() => null);

        const publishLoadedStories = (isFinal = false) => {
          if (thisRequest !== requestId) return;

          set({
            stories: orderedStories.filter((story): story is Story => story !== null),
            loading: !isFinal,
          });
        };

        const limit = pLimit(15);
        const storyPromises = paginatedIds.map((id, index) =>
          limit(async () => {
            try {
              const story = await getStory(id, abort.signal);
              if (thisRequest !== requestId) return;

              orderedStories[index] = story;
              publishLoadedStories();
            } catch (err) {
              if (
                err instanceof DOMException &&
                err.name === "AbortError"
              ) {
                throw err;
              }
              console.error(`Error fetching story ${id}:`, err);
            }
          }),
        );

        await Promise.all(storyPromises);
        if (thisRequest !== requestId) return;

        publishLoadedStories(true);
      } catch (err) {
        if (err instanceof DOMException && err.name === "AbortError") {
          return;
        }
        if (thisRequest !== requestId) return;
        set({
          error:
            err instanceof Error ? err : new Error("An error occurred"),
          loading: false,
        });
      }
    },
  };
});

export default useStoriesStore;
