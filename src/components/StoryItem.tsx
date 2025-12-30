import React from "react";
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

  const handleClick = () => {
    onClick(story.id);
  };

  const handleUrlClick = () => {
    markStoryVisited(story.id);
  };

  // Determine the appropriate class based on visited status
  const getStoryItemClass = () => {
    let className = "story-item";
    if (visitedStoryIds.includes(story.id)) {
      className += " visited-story";
    }
    return className;
  };

  return (
    <div className={getStoryItemClass()}>
      <div className="story-title">
        <div className="story-title-row">
          {story.url ? (
            <a
              href={story.url}
              rel="noopener noreferrer"
              onClick={handleUrlClick}
            >
              {story.title}
            </a>
          ) : (
            <button onClick={handleClick} className="story-title-button">
              {story.title}
            </button>
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
        <button className="story-comments-link" onClick={handleClick}>
          {story.descendants || 0} comments
        </button>
      </div>
    </div>
  );
};

export default StoryItem;
