import React from 'react';
import LiveItemDisplay from './LiveItemDisplay';
import useLiveStories from '../hooks/useLiveStories';

interface LiveStoriesPageProps {
  onStorySelect: (id: number) => void;
}

const LiveStoriesPage: React.FC<LiveStoriesPageProps> = ({ onStorySelect }) => {
  const {
    items,
    error,
    loading,
    timelinePending,
  } = useLiveStories();

  if (error) {
    return <div className="error">Error loading live feed: {error.message}</div>;
  }

  return (
    <div className="stories-page">
      <h1>Hacker News Live</h1>

      {/* Status bar */}
      <div className="live-status-bar" aria-live="polite">
        <span className="live-status-label">Queued items: {timelinePending}</span>
      </div>

      {loading && items.length === 0 ? (
        <div className="loading-indicator">Loading recent items...</div>
      ) : items.length === 0 ? (
        <div className="loading-indicator">Waiting for new items...</div>
      ) : (
        <div className="comments-list">
          {items.map((item) => (
            <div key={item.id} className="newly-added">
              <LiveItemDisplay item={item} onStoryClick={onStorySelect} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LiveStoriesPage;
