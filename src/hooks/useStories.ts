import { useEffect } from "react";
import useStoriesStore from "../store/useStoriesStore";
import { STORIES_PER_PAGE } from "../utils/constants";

export const useStories = (
  page: number = 0,
  itemsPerPage: number = STORIES_PER_PAGE,
) => {
  const stories = useStoriesStore((state) => state.stories);
  const loading = useStoriesStore((state) => state.loading);
  const error = useStoriesStore((state) => state.error);
  const totalStories = useStoriesStore((state) => state.totalStories);
  const currentPage = useStoriesStore((state) => state.currentPage);
  const fetchStories = useStoriesStore((state) => state.fetchStories);
  const failedStoryIds = useStoriesStore((state) => state.failedStoryIds);
  const retryFailed = useStoriesStore((state) => state.retryFailed);
  const outOfRange = useStoriesStore((state) => state.outOfRange);
  const cancel = useStoriesStore((state) => state.cancel);

  useEffect(() => {
    // Store internally manages its own AbortController:
    // calling fetchStories aborts any previous in-flight request.
    fetchStories(page, itemsPerPage);
    return cancel;
  }, [fetchStories, page, itemsPerPage, cancel]);

  return {
    stories,
    loading,
    error,
    failedStoryIds,
    retryFailed,
    outOfRange,
    totalStories,
    totalPages: Math.max(1, Math.ceil(totalStories / itemsPerPage)),
    currentPage,
  };
};

export default useStories;
