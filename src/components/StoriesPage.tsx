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
    totalStories
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
              <span className="page-range"> (stories {startIndex + 1}-{startIndex + stories.length} of {totalStories})</span>
            </>
          )}
        </div>
      </div>
      
      {stories.length === 0 && loading ? (
        <div className="loading-indicator">Loading stories...</div>
      ) : (
        <div className="stories-list">
          {stories.map((story, index) => (
            <div key={story.id} className="story-container">
              <span className="story-index">{startIndex + index + 1}.</span>
              <StoryItem 
                story={story} 
                onClick={onStorySelect} 
              />
            </div>
          ))}
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
