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
    <div className="flex-1 -mx-2 px-2 py-1 rounded-md">
      <div className="mb-1">
        <a
          href={story.url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-900 dark:text-gray-100 font-medium hover:underline"
        >
          {story.title}
        </a>
        {story.url && (
          <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
            ({formatUrl(story.url)})
          </span>
        )}
      </div>
      <div className="flex flex-wrap text-xs text-gray-500 dark:text-gray-400">
        <span className="mr-2">{story.score} points</span>{" "}
        <span className="mr-2">by {story.by}</span>{" "}
        <span className="mr-2">{formatTime(story.time)}</span>{" "}
        <a
          className="hover:underline cursor-auto"
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
