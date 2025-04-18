import React, { useState, useEffect, useCallback } from "react";
import { Comment as CommentType } from "../types";

interface CommentProps {
  comment: CommentType & {
    children?: any[];
    isExpanded?: boolean;
    childrenLoaded?: boolean;
    isLoading?: boolean;
  };
  onToggle: (id: number) => void;
  onLoadChildren: (id: number) => void;
  level?: number;
}

const MAX_INDENT = 4; // Maximum level of indentation

const Comment: React.FC<CommentProps> = ({
  comment,
  onToggle,
  onLoadChildren,
  level = 0,
}) => {
  const [expanded, setExpanded] = useState(comment.isExpanded);

  useEffect(() => {
    setExpanded(comment.isExpanded);
  }, [comment.isExpanded]);

  const handleToggle = useCallback(() => {
    onToggle(comment.id);
  }, [comment.id, onToggle]);

  const handleLoadChildren = useCallback(() => {
    if (!comment.childrenLoaded && comment.kids && comment.kids.length > 0) {
      onLoadChildren(comment.id);
    }
  }, [comment, onLoadChildren]);

  // If the comment is deleted or dead, show minimal content
  if (comment.deleted || comment.dead) {
    return (
      <div className="comment comment-deleted">
        <div className="comment-content">[deleted]</div>
      </div>
    );
  }

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

  // Determine border style for deeply nested comments (level > MAX_INDENT)
  const extraClass = level > MAX_INDENT ? "deeply-nested" : "";

  // Determine indentation class (levels 1 to MAX_INDENT)
  const indentClass =
    level > 0 && level <= MAX_INDENT ? `comment-indent-${level}` : "";

  // Combine classes, ensuring deeply-nested overrides indentClass margin if needed
  const combinedClasses = ["comment", extraClass, indentClass]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={combinedClasses}>
      <div className="comment-header">
        <span className="comment-author">{comment.by}</span>
        <a
          href={`https://news.ycombinator.com/item?id=${comment.id}`}
          className="comment-time"
        >
          {formatTime(comment.time)}
        </a>
        <button className="comment-toggle" onClick={handleToggle}>
          {expanded ? "[-]" : "[+]"}
        </button>
      </div>

      {expanded && (
        <>
          <div
            className="comment-content"
            dangerouslySetInnerHTML={{ __html: comment.text || "" }}
          />

          {comment.kids &&
            comment.kids.length > 0 &&
            !comment.childrenLoaded && (
              <button
                className={`load-more-button ${comment.isLoading ? "loading" : ""}`}
                onClick={handleLoadChildren}
                disabled={comment.isLoading}
              >
                {comment.isLoading
                  ? "Loading..."
                  : `Load replies (${comment.kids.length})`}
              </button>
            )}

          {comment.children && comment.children.length > 0 && (
            <div className="comment-children">
              {comment.children.map((childComment) => (
                <Comment
                  key={childComment.id}
                  comment={childComment}
                  onToggle={onToggle}
                  onLoadChildren={onLoadChildren}
                  level={level + 1}
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default React.memo(Comment);
