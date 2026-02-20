import { useEffect } from "react";
import useLiveStoriesStore from "../store/useLiveStoriesStore";

export const useLiveStories = () => {
  const items = useLiveStoriesStore((state) => state.items);
  const error = useLiveStoriesStore((state) => state.error);
  const loading = useLiveStoriesStore((state) => state.loading);
  const pendingCount = useLiveStoriesStore((state) => state.pendingCount);
  const start = useLiveStoriesStore((state) => state.start);
  const stop = useLiveStoriesStore((state) => state.stop);

  useEffect(() => {
    start();
    return () => {
      stop();
    };
  }, [start, stop]);

  return {
    items,
    error,
    loading,
    timelinePending: pendingCount,
  };
};

export default useLiveStories;
