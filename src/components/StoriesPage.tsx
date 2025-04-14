import React from 'react';
import StoryItem from './StoryItem';
import useStories from '../hooks/useStories';

interface StoriesPageProps {
  onStorySelect: (id: number) => void;
  page: number;
  onPageChange: (page: number) => void;
}

const StoriesPage: React.FC<StoriesPageProps> = ({ 
  onStorySelect, 
  page, 
  onPageChange 
}) => {
  const { 
    stories, 
    loading, 
    error, 
    totalPages, 
    currentPage,
    totalStories,
    togglePinned,
    pinnedStories
  } = useStories(page);

  // Calculate the starting index for the current page
  const startIndex = currentPage * 30;

  const handleNextPage = () => {
    if (currentPage < totalPages - 1) {
      onPageChange(currentPage + 1);
      window.scrollTo(0, 0);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      onPageChange(currentPage - 1);
      window.scrollTo(0, 0);
    }
  };

  if (error) {
    return <div className="error">Error loading stories: {error.message}</div>;
  }

  // Count of pinned stories for display
  const pinnedCount = pinnedStories.length;

  return (
    <div className="stories-page">
      <h1>Hacker News Top Stories</h1>
      
      <div className="stories-controls">
        <div className="stories-nav">
          {currentPage > 0 && (
            <a href="#" onClick={(e) => {
              e.preventDefault();
              handlePrevPage();
            }}>← Previous</a>
          )}
          
          {currentPage < totalPages - 1 && (
            <a href="#" onClick={(e) => {
              e.preventDefault();
              handleNextPage();
            }}>Next →</a>
          )}
        </div>
        
        <div className="page-info">
          {loading && stories.length === 0 ? 'Loading stories...' : (
            <>
              Page {currentPage + 1} of {totalPages}
              <span className="page-range"> (stories {startIndex + 1}-{startIndex + Math.min(stories.length - pinnedCount, 30)} of {totalStories})</span>
              {pinnedCount > 0 && <span className="pinned-count"> ({pinnedCount} pinned at top)</span>}
            </>
          )}
        </div>
      </div>
      
      {stories.length === 0 && loading ? (
        <div className="loading-indicator">Loading stories...</div>
      ) : (
        <div className="stories-list">
          {stories.map((story, index) => {
            // Adjust the index display for pinned stories
            const isPinned = story.pinned;
            const displayIndex = isPinned 
              ? '' // Remove the pin emoji from the index
              : (startIndex + index - pinnedCount + 1) + '.';
            
            return (
              <div key={story.id} className={`story-container ${isPinned ? 'pinned-container' : ''}`}>
                <span className="story-index">{displayIndex}</span>
                <StoryItem 
                  story={story} 
                  onClick={onStorySelect}
                  onTogglePin={togglePinned}
                />
              </div>
            );
          })}
        </div>
      )}
      
      {stories.length > 0 && loading && (
        <div className="loading-more">Loading more stories...</div>
      )}
      
      {stories.length > 0 && (
        <div className="stories-controls stories-controls-bottom">
          <div className="stories-nav">
            {currentPage > 0 && (
              <a href="#" onClick={(e) => {
                e.preventDefault();
                handlePrevPage();
              }}>← Previous</a>
            )}
            
            {currentPage < totalPages - 1 && (
              <a href="#" onClick={(e) => {
                e.preventDefault();
                handleNextPage();
              }}>Next →</a>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoriesPage;
