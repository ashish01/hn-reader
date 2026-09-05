import React from "react";
import { Link } from "react-router-dom";
import StoryItem from "./StoryItem";
import PaginationNav from "./PaginationNav";
import useStories from "../hooks/useStories";
import { STORIES_PER_PAGE } from "../utils/constants";

interface StoriesPageProps {
  page: number;
}

const StoriesPage: React.FC<StoriesPageProps> = ({ page }) => {
  const {
    stories, loading, error, totalPages, currentPage, totalStories,
    failedStoryIds, retryFailed, outOfRange,
  } = useStories(page);

  // Calculate the starting index for the current page
  const startIndex = currentPage * STORIES_PER_PAGE;
  const expectedStoriesOnPage = Math.min(
    STORIES_PER_PAGE,
    Math.max(totalStories - startIndex, 0),
  );

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

  if (outOfRange) {
    return (
      <div className="error">
        This page is out of range. <Link to="/">Back to stories</Link>
      </div>
    );
  }

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

      {failedStoryIds.length > 0 && (
        <div role="alert">
          {failedStoryIds.length} stories could not be loaded.{" "}
          <button type="button" className="load-more-button" onClick={retryFailed} disabled={loading}>
            Retry missing stories
          </button>
        </div>
      )}

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
              {stories.length > 0 && (
                <span className="page-range">
                  {" "}
                  (stories {startIndex + 1}-
                  {startIndex + Math.min(stories.length, STORIES_PER_PAGE)} of{" "}
                  {totalStories})
                </span>
              )}
              {loading && stories.length > 0
                ? ` • loaded ${stories.length}/${expectedStoriesOnPage || STORIES_PER_PAGE}`
                : null}
            </>
          )}
        </div>
      </div>

      {!loading && stories.length === 0 && failedStoryIds.length === 0 && (
        <p>No stories available.</p>
      )}

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
        <div className="loading-more">
          Loading more stories... ({stories.length}/
          {expectedStoriesOnPage || STORIES_PER_PAGE})
        </div>
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
