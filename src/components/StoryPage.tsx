import React from "react";
import { Link, useLocation } from "react-router-dom";
import useStoryWithComments from "../hooks/useStoryWithComments";
import Comment from "./Comment";
import { formatTime, formatUrl } from "../utils/formatters";

interface StoryPageProps {
  storyId: number;
}

interface StoryPageLocationState {
  from?: {
    pathname: string;
    search?: string;
    hash?: string;
  };
}

const StoryPage: React.FC<StoryPageProps> = ({ storyId }) => {
  const location = useLocation();
  const {
    story,
    comments,
    loading,
    loadingComments,
    error,
    toggleComment,
    loadCommentChildren,
  } = useStoryWithComments(storyId);

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
  const commentCount = story.descendants ?? 0;
  const locationState = location.state as StoryPageLocationState | null;
  const from = locationState?.from;
  const backTo = from
    ? `${from.pathname}${from.search || ""}${from.hash || ""}`
    : "/";

  return (
    <div className="story-page">
      <Link className="back-button" to={backTo}>
        ← Back to stories
      </Link>

      <div className="story-details">
        <h1>
          <a
            href={`https://news.ycombinator.com/item?id=${story.id}`}
            target="_blank"
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

        {story.text && (
          <div
            className="story-text"
            dangerouslySetInnerHTML={{ __html: story.text }}
          />
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
          <div className="loading-comments" aria-live="polite">
            Loading comments...
          </div>
        )}
      </div>
    </div>
  );
};

export default StoryPage;
