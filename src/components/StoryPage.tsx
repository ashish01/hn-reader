import React from "react";
import useStoryWithComments from "../hooks/useStoryWithComments";
import Comment from "./Comment";

interface StoryPageProps {
  storyId: number;
  onBack: () => void;
}

const StoryPage: React.FC<StoryPageProps> = ({ storyId, onBack }) => {
  const {
    story,
    comments,
    loading,
    loadingComments,
    error,
    toggleComment,
    loadCommentChildren,
  } = useStoryWithComments(storyId);

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

  if (loading && !story) {
    return <div className="loading">Loading story...</div>;
  }

  if (error) {
    return <div className="error">Error loading story: {error.message}</div>;
  }

  if (!story) {
    return <div className="error">Story not found</div>;
  }

  // Use the story's descendant count directly instead of the current loaded comment count
  const commentCount = story.descendants || 0;

  return (
    <div className="story-page">
      <button className="back-button" onClick={onBack}>
        ← Back to stories
      </button>

      <div className="story-details">
        <h1>
          <a
            href={`https://news.ycombinator.com/item?id=${story.id}`}
            rel="noopener noreferrer"
          >
            {story.title}
          </a>
        </h1>

        {story.url && (
          <div className="story-url">
            <a href={story.url} target="_blank" rel="noopener noreferrer">
              {formatUrl(story.url)}
            </a>
          </div>
        )}

        <div className="story-meta">
          <span>{story.score} points</span>
          <span>by {story.by}</span>
          <span>{formatTime(story.time)}</span>
          <span>{commentCount} comments</span>
        </div>
      </div>

      <div className="comments-section">
        <h2>
          {loadingComments ? "Loading Comments..." : `${commentCount} Comments`}
        </h2>

        {comments.length === 0 && !loadingComments ? (
          <div className="no-comments">No comments yet</div>
        ) : (
          <div className="comments-list">
            {comments.map((comment) => (
              <Comment
                key={comment.id}
                comment={comment}
                onToggle={toggleComment}
                onLoadChildren={loadCommentChildren}
              />
            ))}
          </div>
        )}

        {loadingComments && comments.length === 0 && (
          <div className="loading-comments">Loading comments...</div>
        )}
      </div>
    </div>
  );
};

export default StoryPage;
