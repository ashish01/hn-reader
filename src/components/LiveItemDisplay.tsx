import React from 'react';
import { Item } from '../types';
import { formatTime, formatUrl } from '../utils/formatters';

interface LiveItemDisplayProps {
  item: Item;
  onStoryClick?: (id: number) => void;
}

const LiveItemDisplay: React.FC<LiveItemDisplayProps> = ({ item, onStoryClick }) => {
  const renderItemContent = () => {
    switch (item.type) {
      case 'story': {
        const isVisited = (item as any).visited;
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
              <span style={{ color: 'var(--hn-orange)' }}>story</span>
            </div>
            <div className="comment-content">
              {item.url ? (
                <>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontWeight: 500, fontSize: '14px' }}
                  >
                    {item.title}
                  </a>
                  {item.url && (
                    <span className="story-domain"> ({formatUrl(item.url)})</span>
                  )}
                </>
              ) : (
                <button
                  onClick={handleClick}
                  className="story-title-button"
                  style={{ fontWeight: 500, fontSize: '14px' }}
                >
                  {item.title}
                </button>
              )}
              <div style={{ fontSize: '11px', color: 'var(--light-text)', marginTop: '4px' }}>
                {item.score !== undefined && <span>{item.score} points</span>}
                {item.descendants !== undefined && (
                  <>
                    <span> • </span>
                    <button
                      onClick={handleClick}
                      style={{
                        background: 'none',
                        border: 'none',
                        padding: 0,
                        font: 'inherit',
                        color: 'inherit',
                        cursor: 'pointer',
                        textDecoration: 'none'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                      onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
                    >
                      {item.descendants} comments
                    </button>
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
              <span style={{ color: 'var(--light-text)' }}>comment</span>
              {parentId && (
                <>
                  <span>•</span>
                  <a
                    href={`https://news.ycombinator.com/item?id=${parentId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: 'var(--light-text)', textDecoration: 'none' }}
                    onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                    onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
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
                style={{ color: 'var(--light-text)', textDecoration: 'none' }}
                onMouseEnter={(e) => e.currentTarget.style.textDecoration = 'underline'}
                onMouseLeave={(e) => e.currentTarget.style.textDecoration = 'none'}
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
              <span style={{ color: 'var(--hn-orange)' }}>job</span>
            </div>
            <div className="comment-content">
              {item.url ? (
                <>
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ fontWeight: 500, fontSize: '14px' }}
                  >
                    {item.title}
                  </a>
                  {item.url && (
                    <span className="story-domain"> ({formatUrl(item.url)})</span>
                  )}
                </>
              ) : (
                <div style={{ fontWeight: 500, fontSize: '14px' }}>{item.title}</div>
              )}
              {item.text && (
                <div
                  style={{ marginTop: '8px' }}
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
              <span style={{ color: 'var(--light-text)' }}>{item.type}</span>
            </div>
            <div className="comment-content">
              {item.title && <div style={{ fontWeight: 500, fontSize: '14px' }}>{item.title}</div>}
              {item.text && (
                <div
                  style={{ marginTop: '8px' }}
                  dangerouslySetInnerHTML={{ __html: item.text }}
                />
              )}
              {item.score !== undefined && (
                <div style={{ fontSize: '11px', color: 'var(--light-text)', marginTop: '4px' }}>
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
              <span style={{ color: 'var(--light-text)' }}>{item.type || 'unknown'}</span>
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
