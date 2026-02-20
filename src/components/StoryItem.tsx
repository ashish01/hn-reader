import React from "react";
import { Link, useLocation } from "react-router-dom";
import { Story } from "../types";
import { formatTime, formatUrl } from "../utils/formatters";
import useAppStore from "../store/useAppStore";

interface StoryItemProps {
  story: Story;
  onClick: (id: number) => void;
}

const StoryItem: React.FC<StoryItemProps> = ({
  story,
  onClick,
}) => {
  const visitedStoryIds = useAppStore((state) => state.visitedStoryIds);
  const markStoryVisited = useAppStore((state) => state.markStoryVisited);
  const location = useLocation();
  const storyPath = `/story/${story.id}`;
  const storyLinkState = {
    from: {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    },
  };
  const isVisited = visitedStoryIds.includes(story.id);

  const handleClick = () => {
    onClick(story.id);
  };

  const handleUrlClick = () => {
    markStoryVisited(story.id);
  };

  return (
    <div className={isVisited ? "story-item visited-story" : "story-item"}>
      <div className="story-title">
        <div className="story-title-row">
          {story.url ? (
            <a
              href={story.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleUrlClick}
            >
              {story.title}
            </a>
          ) : (
            <Link
              to={storyPath}
              state={storyLinkState}
              onClick={handleClick}
              className="story-title-link"
            >
              {story.title}
            </Link>
          )}
          {story.url && <span className="story-domain">({formatUrl(story.url)})</span>}
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
          onClick={handleClick}
        >
          {story.descendants ?? 0} comments
        </Link>
      </div>
    </div>
  );
};

export default StoryItem;
