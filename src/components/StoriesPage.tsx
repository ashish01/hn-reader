import React from "react";
import StoryItem from "./StoryItem";
import PaginationNav from "./PaginationNav";
import useStories from "../hooks/useStories";
import { STORIES_PER_PAGE } from "../utils/constants";

interface StoriesPageProps {
  page: number;
}

const StoriesPage: React.FC<StoriesPageProps> = ({ page }) => {
  const { stories, loading, error, totalPages, currentPage, totalStories } =
    useStories(page);

  // Calculate the starting index for the current page
  const startIndex = currentPage * STORIES_PER_PAGE;

  const getPagePath = (targetPage: number) =>
    targetPage <= 0 ? "/" : `/?page=${targetPage}`;

  const handlePageClick: React.MouseEventHandler<HTMLAnchorElement> = (
    event,
  ) => {
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
    return (
      <div className="error">
        <p>Error loading stories: {error.message}</p>
        <button
          type="button"
          className="load-more-button"
          style={{ marginTop: 12 }}
          onClick={() => window.location.reload()}
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="stories-page">
      <h2>Hacker News Top Stories</h2>

      <div className="stories-controls">
        <PaginationNav
          currentPage={currentPage}
          totalPages={totalPages}
          getPagePath={getPagePath}
          onPageClick={handlePageClick}
        />

        <div className="page-info" aria-live="polite">
          {loading && stories.length === 0 ? (
            "Loading stories..."
          ) : (
            <>
              Page {currentPage + 1} of {totalPages}
              <span className="page-range">
                {" "}
                (stories {startIndex + 1}-
                {startIndex + Math.min(stories.length, STORIES_PER_PAGE)} of{" "}
                {totalStories})
              </span>
            </>
          )}
        </div>
      </div>

      {stories.length === 0 && loading ? (
        <div className="loading-indicator">Loading stories...</div>
      ) : (
        <div className="stories-list">
          {stories.map((story, index) => {
            const displayIndex = startIndex + index + 1 + ".";

            return (
              <div key={story.id} className="story-container">
                <span className="story-index">{displayIndex}</span>
                <StoryItem story={story} />
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
          <PaginationNav
            currentPage={currentPage}
            totalPages={totalPages}
            getPagePath={getPagePath}
            onPageClick={handlePageClick}
          />
        </div>
      )}
    </div>
  );
};

export default StoriesPage;
