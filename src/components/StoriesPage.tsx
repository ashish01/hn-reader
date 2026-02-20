import React from 'react';
import { Link } from 'react-router-dom';
import StoryItem from './StoryItem';
import useStories from '../hooks/useStories';
import { STORIES_PER_PAGE } from '../utils/constants';

interface StoriesPageProps {
  onStorySelect: (id: number) => void;
  page: number;
}

const StoriesPage: React.FC<StoriesPageProps> = ({ 
  onStorySelect, 
  page
}) => {
  const {
    stories,
    loading,
    error,
    totalPages,
    currentPage,
    totalStories
  } = useStories(page);

  // Calculate the starting index for the current page
  const startIndex = currentPage * STORIES_PER_PAGE;

  const getPagePath = (targetPage: number) =>
    targetPage <= 0 ? '/' : `/?page=${targetPage}`;

  const handlePageClick: React.MouseEventHandler<HTMLAnchorElement> = (event) => {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return;
    }

    window.scrollTo(0, 0);
  };

  if (error) {
    return <div className="error">Error loading stories: {error.message}</div>;
  }

  return (
    <div className="stories-page">
      <h1>Hacker News Top Stories</h1>
      
      <div className="stories-controls">
        <div className="stories-nav">
          {currentPage > 0 && (
            <Link to={getPagePath(currentPage - 1)} onClick={handlePageClick}>
              ← Previous
            </Link>
          )}

          {currentPage < totalPages - 1 && (
            <Link to={getPagePath(currentPage + 1)} onClick={handlePageClick}>
              Next →
            </Link>
          )}
        </div>
        
        <div className="page-info" aria-live="polite">
          {loading && stories.length === 0 ? 'Loading stories...' : (
            <>
              Page {currentPage + 1} of {totalPages}
              <span className="page-range"> (stories {startIndex + 1}-{startIndex + Math.min(stories.length, STORIES_PER_PAGE)} of {totalStories})</span>
            </>
          )}
        </div>
      </div>
      
      {stories.length === 0 && loading ? (
        <div className="loading-indicator">Loading stories...</div>
      ) : (
        <div className="stories-list">
          {stories.map((story, index) => {
            const displayIndex = (startIndex + index + 1) + '.';

            return (
              <div key={story.id} className="story-container">
                <span className="story-index">{displayIndex}</span>
                <StoryItem
                  story={story}
                  onClick={onStorySelect}
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
              <Link to={getPagePath(currentPage - 1)} onClick={handlePageClick}>
                ← Previous
              </Link>
            )}

            {currentPage < totalPages - 1 && (
              <Link to={getPagePath(currentPage + 1)} onClick={handlePageClick}>
                Next →
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StoriesPage;
