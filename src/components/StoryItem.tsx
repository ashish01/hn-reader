import React from "react";
import { Story } from "../types";

interface StoryItemProps {
  story: Story;
  onClick: (id: number) => void;
}

const StoryItem: React.FC<StoryItemProps> = ({ story, onClick }) => {
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

  // Format the URL to display just the domain
  const formatUrl = (url: string | undefined) => {
    if (!url) return "";

    try {
      const domain = new URL(url).hostname.replace("www.", "");
      return domain;
    } catch {
      return "";
    }
  };

  return (
    // Apply the .story-item class which now includes padding, margin, radius
    <div className="story-item">
      {/* Apply .story-title class */}
      <div className="story-title">
        <a
          href={story.url}
          rel="noopener noreferrer"
          // Link styles handled by .story-title a in CSS
        >
          {story.title}
        </a>
        {story.url && (
          // Apply .story-domain class
          <span className="story-domain">({formatUrl(story.url)})</span>
        )}
      </div>
      {/* Apply .story-info class */}
      <div className="story-info">
        {/* Remove mr-2, gap is handled by .story-info */}
        <span>{story.score} points</span>
        <span>by {story.by}</span>
        <span>{formatTime(story.time)}</span>
        <a
          // Apply .story-comments-link class
          className="story-comments-link"
          onClick={handleClick}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              handleClick();
            }
          }}
        >
          {story.descendants || 0} comments
        </a>
      </div>
    </div>
  );
};

export default StoryItem;
