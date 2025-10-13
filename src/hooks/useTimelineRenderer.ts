import { useState, useEffect, useRef } from 'react';
import { Item } from '../types';

const MARKER_TICK_INTERVAL = 1000; // Advance marker every 1 second
const MAX_OFFSET = 30; // Never be more than 30 seconds behind NOW

interface TimelineRendererResult {
  displayedItems: Item[];
  renderMarkerTime: number;
  timelinePending: number;
  isLive: boolean;
  markerGapSeconds: number;
}

export const useTimelineRenderer = (timelineBuffer: Item[]): TimelineRendererResult => {
  const [displayedItems, setDisplayedItems] = useState<Item[]>([]);
  const [renderMarkerTime, setRenderMarkerTime] = useState<number>(0);
  const [isLive, setIsLive] = useState<boolean>(false);
  const [markerGapSeconds, setMarkerGapSeconds] = useState<number>(0);

  // Use refs to avoid recreating interval
  const timelineRef = useRef<Item[]>([]);
  const displayedIdsRef = useRef<Set<number>>(new Set());
  const isInitialized = useRef(false);

  // Update timeline ref when new items arrive
  useEffect(() => {
    timelineRef.current = timelineBuffer;

    // Initialize marker on first load
    if (!isInitialized.current && timelineBuffer.length > 0) {
      const now = Math.floor(Date.now() / 1000);

      // Find the newest item that's not in the future
      const validItems = timelineBuffer.filter(item =>
        item.time !== undefined && item.time <= now
      );

      if (validItems.length > 0) {
        // Start marker MAX_OFFSET seconds behind NOW
        // This keeps us within the 30-second window from the start
        const markerStartTime = now - MAX_OFFSET;
        setRenderMarkerTime(markerStartTime);
        isInitialized.current = true;
      }
    }
  }, [timelineBuffer]);

  // Set up interval once - it runs continuously
  useEffect(() => {
    const interval = setInterval(() => {
      if (!isInitialized.current) return;

      setRenderMarkerTime((prevMarkerTime) => {
        const now = Math.floor(Date.now() / 1000);
        let newMarkerTime;

        // If marker is more than MAX_OFFSET behind, jump forward
        const offset = now - prevMarkerTime;
        setMarkerGapSeconds(offset);

        if (offset > MAX_OFFSET) {
          newMarkerTime = now - MAX_OFFSET;
          setIsLive(false);
        } else if (prevMarkerTime >= now) {
          // Check if caught up
          newMarkerTime = now;
          setIsLive(true);
        } else {
          // Normal advance
          newMarkerTime = prevMarkerTime + 1;
          setIsLive(false);
        }

        // Find items to display (always check for items, even when jumping)
        const currentTimeline = timelineRef.current;
        const itemsToDisplay = currentTimeline.filter(item =>
          item.time !== undefined &&
          item.time <= newMarkerTime &&
          !displayedIdsRef.current.has(item.id)
        );

        if (itemsToDisplay.length > 0) {
          // Add to displayed items
          setDisplayedItems((prev) => [...itemsToDisplay.reverse(), ...prev]);

          // Track displayed IDs
          itemsToDisplay.forEach(item => displayedIdsRef.current.add(item.id));
        }

        return newMarkerTime;
      });
    }, MARKER_TICK_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, []); // Empty deps - runs once

  return {
    displayedItems,
    renderMarkerTime,
    timelinePending: timelineBuffer.filter(item => !displayedIdsRef.current.has(item.id)).length,
    isLive,
    markerGapSeconds,
  };
};

export default useTimelineRenderer;
