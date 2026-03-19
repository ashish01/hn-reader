import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Story } from "../types";
import { formatTime, formatUrl } from "../utils/formatters";

interface StoryItemProps {
  story: Story;
}

const StoryItem: React.FC<StoryItemProps> = ({ story }) => {
  const location = useLocation();
  const storyPath = `/story/${story.id}`;
  const storyLinkState = {
    from: {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    },
  };

  return (
    <div className="story-item">
      <div className="story-title">
        <div className="story-title-row">
          {story.url ? (
            <a
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {story.title}
            </a>
          ) : (
            <Link
              to={storyPath}
              state={storyLinkState}
              className="story-title-link"
            >
              {story.title}
            </Link>
          )}
          {story.url && (
            <span className="story-domain">({formatUrl(story.url)})</span>
          )}
        </div>
      </div>
      <div className="story-info">
        <span>{story.score} points</span>
        <span>by {story.by}</span>
        <span>{formatTime(story.time)}</span>
        <Link
          to={storyPath}
          state={storyLinkState}
          className="story-comments-link"
        >
          {story.descendants ?? 0} comments
        </Link>
      </div>
    </div>
  );
};

export default React.memo(StoryItem);
