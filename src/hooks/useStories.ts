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

  useEffect(() => {
    // Store internally manages its own AbortController:
    // calling fetchStories aborts any previous in-flight request.
    fetchStories(page, itemsPerPage);
  }, [fetchStories, page, itemsPerPage]);

  return {
    stories,
    loading,
    error,
    totalStories,
    totalPages: Math.max(1, Math.ceil(totalStories / itemsPerPage)),
    currentPage,
  };
};

export default useStories;
