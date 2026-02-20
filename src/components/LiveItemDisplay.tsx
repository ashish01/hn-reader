import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Item } from '../types';
import { formatTime, formatUrl } from '../utils/formatters';
import useAppStore from '../store/useAppStore';

interface LiveItemDisplayProps {
  item: Item;
  onStoryClick?: (id: number) => void;
}

const LiveItemDisplay: React.FC<LiveItemDisplayProps> = ({ item, onStoryClick }) => {
  const visitedStoryIds = useAppStore((state) => state.visitedStoryIds);
  const location = useLocation();
  const storyPath = `/story/${item.id}`;
  const storyLinkState = {
    from: {
      pathname: location.pathname,
      search: location.search,
      hash: location.hash,
    },
  };

  const renderItemContent = () => {
    switch (item.type) {
      case 'story': {
        const isVisited = visitedStoryIds.includes(item.id);
        const handleClick = () => {
          if (onStoryClick) {
            onStoryClick(item.id);
          }
        };

        return (
          <div className={`comment ${isVisited ? 'visited-story' : ''}`}>
            <div className="comment-header">
              <span className="comment-author">{item.by || 'unknown'}</span>
              <span>•</span>
              <span>{formatTime(item.time)}</span>
              <span>•</span>
              <span className="item-kind item-kind-story">story</span>
            </div>
            <div className="comment-content">
              {item.url ? (
                <>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleClick}
                    className="live-item-link"
                  >
                    {item.title}
                  </a>
                  <span className="story-domain"> ({formatUrl(item.url)})</span>
                </>
              ) : (
                <Link
                  to={storyPath}
                  state={storyLinkState}
                  onClick={handleClick}
                  className="story-title-link live-item-link"
                >
                  {item.title}
                </Link>
              )}
              <div className="live-item-meta">
                {item.score !== undefined && <span>{item.score} points</span>}
                {item.descendants !== undefined && (
                  <>
                    <span> • </span>
                    <Link
                      to={storyPath}
                      state={storyLinkState}
                      onClick={handleClick}
                      className="story-comments-link"
                    >
                      {item.descendants} comments
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        );
      }

      case 'comment': {
        // For comments, we need to find the root story
        // The parent could be another comment or a story
        const parentId = item.parent;

        return (
          <div className="comment">
            <div className="comment-header">
              <span className="comment-author">{item.by || 'unknown'}</span>
              <span>•</span>
              <span>{formatTime(item.time)}</span>
              <span>•</span>
              <span className="item-kind item-kind-muted">comment</span>
              {parentId && (
                <>
                  <span>•</span>
                  <a
                    href={`https://news.ycombinator.com/item?id=${parentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="muted-link"
                  >
                    parent
                  </a>
                </>
              )}
              <span>•</span>
              <a
                href={`https://news.ycombinator.com/item?id=${item.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="muted-link"
              >
                on HN
              </a>
            </div>
            <div
              className="comment-content"
              dangerouslySetInnerHTML={{ __html: item.text || '[deleted]' }}
            />
          </div>
        );
      }

      case 'job': {
        return (
          <div className="comment">
            <div className="comment-header">
              <span className="comment-author">{item.by || 'unknown'}</span>
              <span>•</span>
              <span>{formatTime(item.time)}</span>
              <span>•</span>
              <span className="item-kind item-kind-story">job</span>
            </div>
            <div className="comment-content">
              {item.url ? (
                <>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="live-item-link"
                  >
                    {item.title}
                  </a>
                  <span className="story-domain"> ({formatUrl(item.url)})</span>
                </>
              ) : (
                <div className="item-title-text">{item.title}</div>
              )}
              {item.text && (
                <div
                  className="item-body-block"
                  dangerouslySetInnerHTML={{ __html: item.text }}
                />
              )}
            </div>
          </div>
        );
      }

      case 'poll':
      case 'pollopt': {
        return (
          <div className="comment">
            <div className="comment-header">
              <span className="comment-author">{item.by || 'unknown'}</span>
              <span>•</span>
              <span>{formatTime(item.time)}</span>
              <span>•</span>
              <span className="item-kind item-kind-muted">{item.type}</span>
            </div>
            <div className="comment-content">
              {item.title && <div className="item-title-text">{item.title}</div>}
              {item.text && (
                <div
                  className="item-body-block"
                  dangerouslySetInnerHTML={{ __html: item.text }}
                />
              )}
              {item.score !== undefined && (
                <div className="live-item-meta">
                  {item.score} points
                </div>
              )}
            </div>
          </div>
        );
      }

      default: {
        return (
          <div className="comment">
            <div className="comment-header">
              <span className="comment-author">{item.by || 'unknown'}</span>
              <span>•</span>
              <span>{formatTime(item.time)}</span>
              <span>•</span>
              <span className="item-kind item-kind-muted">{item.type || 'unknown'}</span>
            </div>
            <div className="comment-content">
              {item.title && <div>{item.title}</div>}
              {item.text && (
                <div dangerouslySetInnerHTML={{ __html: item.text }} />
              )}
            </div>
          </div>
        );
      }
    }
  };

  return renderItemContent();
};

export default LiveItemDisplay;
