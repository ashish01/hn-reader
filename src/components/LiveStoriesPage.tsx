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
    renderMarkerTime,
    timelinePending,
    isLive,
    lastUpdateTime,
    markerGapSeconds,
    baseDelaySeconds,
  } = useLiveStories();

  if (error) {
    return <div className="error">Error loading live feed: {error.message}</div>;
  }

  return (
    <div className="stories-page">
      <h1>Hacker News Live</h1>

      {/* Status bar */}
      {renderMarkerTime > 0 && (
        <div
          style={{
            padding: '8px 12px',
            marginBottom: '16px',
            backgroundColor: 'var(--card-background)',
            border: '1px solid var(--border-color)',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--light-text)',
            fontFamily: 'monospace',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px'
          }}
        >
          <span style={{ color: isLive ? '#ff6600' : 'var(--light-text)', fontWeight: 'bold' }}>
            {isLive
              ? `⏱️ Buffered playback (~${baseDelaySeconds}s delay)`
              : `▶️ Replay queue: ${timelinePending} item${timelinePending === 1 ? '' : 's'}`}
          </span>
          {lastUpdateTime > 0 && (
            <span>
              Last update: {new Date(lastUpdateTime).toLocaleTimeString()} ({Math.floor((Date.now() - lastUpdateTime) / 1000)}s ago)
            </span>
          )}
          <span>
            Playback time: {new Date(renderMarkerTime * 1000).toLocaleTimeString()} (~{baseDelaySeconds}s behind real time)
          </span>
          <span>
            {markerGapSeconds > 0
              ? `Next item in ${markerGapSeconds}s`
              : 'Awaiting next item'}
          </span>
        </div>
      )}

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
