# Live Mode Specification

## Overview
Add a real-time live feed of **all** Hacker News items (stories, comments, jobs, polls, etc.) at `/live` endpoint. New items appear automatically at the top with smooth push-down animations. No manual refresh needed, no pagination, no item numbering.

## Navigation Changes

### Header Modification (src/App.tsx)
- Add "Live Mode" link next to the "Light Mode"/"Dark Mode" button
- Style it identically to the theme toggle button
- Links to `/live` route

```jsx
<button className="theme-toggle" onClick={toggleDarkMode}>
  {darkMode ? "Light Mode" : "Dark Mode"}
</button>
<Link to="/live" className="theme-toggle">Live Mode</Link>
```

**CSS (use existing `.theme-toggle` class):**
```css
.theme-toggle {
    background: none;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    color: var(--text-color);
    padding: 5px 10px;
    cursor: pointer;
}

.theme-toggle:hover {
    background-color: rgba(0, 0, 0, 0.05);
}
```

## Firebase Integration

### Dependencies
```bash
npm install firebase
```

### Firebase Service (src/services/firebase.ts)
```javascript
import { initializeApp } from 'firebase/app';
import { getDatabase } from 'firebase/database';

const app = initializeApp({
  databaseURL: 'https://hacker-news.firebaseio.com'
});

export const db = getDatabase(app);
```

## Hooks

### useMaxItemListener (src/hooks/useMaxItemListener.ts)
- Listen to Firebase `/v0/maxitem` using `onValue()`
- Track previous maxId in a ref
- When maxId changes, calculate delta: `itemsToCheck = [prevMaxId + 1 ... newMaxId]`
- Fetch all items in range in parallel
- **Include ALL item types** (stories, comments, jobs, polls, pollopts)
- Return array of new Item objects (not filtered)
- Clean up Firebase listener on unmount

**Key behaviors:**
- On initial load, fetch the last 30 items to populate the feed
- After initialization, only process deltas (new items)
- Handle large deltas gracefully (limit to last 50 items if delta > 50)
- Filter out null/deleted/dead items via `getItemsBatch`
- Return `loading` state for initial fetch

### useLiveStories (src/hooks/useLiveStories.ts)
- Integrate `useMaxItemListener`
- Maintain state of all displayed items (not just stories)
- When new items arrive, prepend them to the top of the list
- Mark stories as visited if they're in localStorage
- Limit to 200 items max to prevent memory issues
- Return items array, loading, and error states

## Components

### LiveItemDisplay (src/components/LiveItemDisplay.tsx)
New component to display different HN item types appropriately:

- **Stories**: Shows title (link/button), domain, points, comment count with link
- **Comments**: Shows author, timestamp, comment text, parent link, "on HN" link
- **Jobs**: Shows title, link, description
- **Polls/PollOpts**: Shows title, text, score

Uses comment-style layout (`.comment` class) with proper spacing and borders.

**Comment Features:**
- Link to parent item: `https://news.ycombinator.com/item?id={parentId}`
- Link to view on HN: `https://news.ycombinator.com/item?id={itemId}`
- Displays author, timestamp, and type label

### LiveStoriesPage (src/components/LiveStoriesPage.tsx)
- Use `useLiveStories` hook to get all items
- Display items in reverse chronological order (newest first)
- Uses `.comments-list` container for comment-style spacing
- **No numbering** - continuous feed without item numbers
- **No pagination** - accumulates up to 200 items
- **No notification banner or button** - items appear automatically
- Uses `LiveItemDisplay` component for rendering

**Layout:**
```jsx
<div className="stories-page">
  <h1>Hacker News Live</h1>
  <div className="comments-list">
    {items.map((item) => (
      <div key={item.id} className="newly-added">
        <LiveItemDisplay item={item} onStoryClick={onStorySelect} />
      </div>
    ))}
  </div>
</div>
```

## Animations

### New Item Insertion (src/App.css)

```css
/* Animation for newly inserted items */
@keyframes slideInFromTop {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes highlightFlash {
  0% {
    background-color: rgba(255, 102, 0, 0.15);
  }
  100% {
    background-color: transparent;
  }
}

.newly-added {
  animation: slideInFromTop 0.4s ease-out,
             highlightFlash 2s ease-out;
}
```

**Animation Strategy:**
1. New items appear at top with `slideInFromTop` animation (0.4s)
2. Existing items automatically push down (browser handles this)
3. Subtle orange highlight flash (2s) to draw attention to new items
4. Use CSS transitions for smooth, performant animations
5. Applied to all item types (stories, comments, jobs, polls)

## Routing

### Add /live Route (src/App.tsx)
```jsx
<Routes>
  <Route path="/" element={<StoriesRoute />} />
  <Route path="/live" element={<LiveStoriesRoute />} />
  <Route path="/story/:storyId" element={<StoryRoute />} />
</Routes>
```

### LiveStoriesRoute Component
```jsx
function LiveStoriesRoute() {
  const navigate = useNavigate();

  const handleStorySelect = (id: number) => {
    markStoryAsVisited(id);
    navigate(`/story/${id}`);
  };

  return <LiveStoriesPage onStorySelect={handleStorySelect} />;
}
```

## Styling

### Use Existing App Styles
- `.stories-page` - main container
- `.comments-list` - items container (provides spacing between items)
- `.comment` - individual item wrapper (used for all item types)
- `.comment-header` - item metadata (author, time, type, links)
- `.comment-content` - item content
- `.comment-author` - author name styling
- All existing typography, colors, spacing
- Dark mode support via CSS variables

**Note:** Uses comment-style layout for consistent spacing and visual hierarchy across all item types

### Colors & Variables (already defined in index.css)
```css
:root {
  --hn-orange: #ff6600;
  --text-color: #333;
  --light-text: #666;
  --border-color: #ddd;
  --background-color: #fff;
  --card-background: #fff;
}

.dark-mode {
  --text-color: #e4e4e4;
  --light-text: #aaa;
  --border-color: #444;
  --background-color: #121212;
  --card-background: #1e1e1e;
}
```

## Edge Cases & Considerations

1. **Large deltas:** If delta > 50 items since last check, only fetch last 50
2. **Connection loss:** Firebase SDK handles reconnection automatically
3. **Tab visibility:** Consider pausing updates when tab is hidden (optional - not implemented)
4. **Deleted/dead items:** Filter out via `getItemsBatch` before displaying
5. **All item types:** Display stories, comments, jobs, polls, pollopts - no filtering
6. **Memory management:** Limit to 200 items max, removes oldest when exceeded
7. **Clicking stories:** Use same `markStoryAsVisited` and navigation as regular mode
8. **Comment parent links:** External links to HN for parent and full thread context
9. **Initial load:** Fetches last 30 items to populate feed immediately

## Implementation Order

1. ✅ **Add Firebase SDK** - Install package, create firebase.ts service
2. ✅ **Create useMaxItemListener hook** - Firebase listener with delta detection, initial load
3. ✅ **Enhance API** - Add batch fetching (`getItemsBatch`, `getMaxItemId`)
4. ✅ **Create useLiveStories hook** - Integrate listener, manage items state
5. ✅ **Create LiveItemDisplay component** - Display all item types appropriately
6. ✅ **Create LiveStoriesPage component** - UI for live feed
7. ✅ **Add CSS animations** - Smooth insertion effects
8. ✅ **Update App.tsx** - Add route and header link
9. ✅ **Add comment links** - Parent and "on HN" links for comments

## Success Criteria

- ✅ All item types appear automatically without refresh (stories, comments, jobs, polls)
- ✅ Smooth slide-in animation with highlight flash when items are inserted
- ✅ Uses existing app styles (comment-style layout for consistency)
- ✅ Works in both light and dark mode
- ✅ Stories are clickable and navigate to detail view
- ✅ Comments show parent link and "on HN" link for context
- ✅ No polling - uses Firebase real-time listeners
- ✅ Handles connection issues gracefully (Firebase SDK)
- ✅ Clean, minimal UI - no numbering, no pagination, no buttons
- ✅ Initial load shows recent items immediately
- ✅ Memory management - limits to 200 items
