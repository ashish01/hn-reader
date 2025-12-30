import { useEffect } from "react";
import useLiveStoriesStore, {
  MARKER_DELAY_SECONDS,
} from "../store/useLiveStoriesStore";

export const useLiveStories = () => {
  const items = useLiveStoriesStore((state) => state.items);
  const error = useLiveStoriesStore((state) => state.error);
  const loading = useLiveStoriesStore((state) => state.loading);
  const pendingCount = useLiveStoriesStore((state) => state.pendingCount);
  const lastUpdateTime = useLiveStoriesStore((state) => state.lastUpdateTime);
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
    renderMarkerTime: Math.floor(Date.now() / 1000) - MARKER_DELAY_SECONDS,
    timelinePending: pendingCount,
    isLive: pendingCount === 0,
    lastUpdateTime,
    markerGapSeconds: 0,
    baseDelaySeconds: MARKER_DELAY_SECONDS,
  };
};

export default useLiveStories;
