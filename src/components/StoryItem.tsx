import React, { useState } from "react";
import { Story } from "../types";
import { getDomain } from "tldts";

interface StoryItemProps {
  story: Story;
  onClick: (id: number) => void;
  onTogglePin?: (story: Story) => void;
}

const StoryItem: React.FC<StoryItemProps> = ({
  story: initialStory,
  onClick,
  onTogglePin,
}) => {
  // Use local state to track visited status for immediate UI updates
  const [story, setStory] = useState<Story>(initialStory);

  // Update local state when prop changes
  React.useEffect(() => {
    setStory(initialStory);
  }, [initialStory]);
  // Format the time as a relative time string
  const formatTime = (time: number | undefined) => {
    if (!time) return "";

    const date = new Date(time * 1000);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
  };

  const handleClick = () => {
    onClick(story.id);
  };

  const handlePinClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onTogglePin) {
      // Update local state first for immediate feedback
      setStory((prevStory) => ({
        ...prevStory,
        pinned: !prevStory.pinned,
      }));

      // Then update storage through the parent
      onTogglePin(story);
    }
  };

  const handleUrlClick = () => {
    // Import would create a circular dependency, so we access directly
    try {
      const visitedStories = JSON.parse(
        localStorage.getItem("hn-visited-stories") || "[]",
      );
      if (!visitedStories.includes(story.id)) {
        visitedStories.push(story.id);
        localStorage.setItem(
          "hn-visited-stories",
          JSON.stringify(visitedStories),
        );

        // Update local state for immediate UI update
        setStory((prevStory) => ({
          ...prevStory,
          visited: true,
        }));

        // Dispatch a storage event so other components can react to this change
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "hn-visited-stories",
          }),
        );
      }
    } catch (e) {
      console.error("Error saving visited story to localStorage:", e);
    }
  };

  // Format the URL to display just the domain
  const formatUrl = (url: string | undefined) => {
    if (!url) return "";

    try {
      const domain = getDomain(url, { allowPrivateDomains: true });
      return domain;
    } catch {
      return "";
    }
  };

  // Determine the appropriate class based on visited and pinned status
  const getStoryItemClass = () => {
    let className = "story-item";
    if (story.visited && !story.pinned) {
      className += " visited-story";
    }
    if (story.pinned) {
      className += " pinned-story";
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
            <a
              onClick={(e) => {
                e.preventDefault();
                handleClick();
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  handleClick();
                }
              }}
              style={{ cursor: 'pointer' }}
            >
              {story.title}
            </a>
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
        <a
          className="story-comments-link"
          href={`/story/${story.id}`}
          onClick={(e) => {
            e.preventDefault();
            handleClick();
          }}
        >
          {story.descendants || 0} comments
        </a>
        {onTogglePin && (
          <a
            className={`pin-link ${story.pinned ? "pinned" : ""}`}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              handlePinClick(e);
            }}
          >
            {story.pinned ? "unpin" : "pin"}
          </a>
        )}
      </div>
    </div>
  );
};

export default StoryItem;
