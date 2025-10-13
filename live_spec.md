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

## Timeline-Based Rendering Architecture

### Core Concept
The live feed uses a **timeline with delayed playback** approach to create smooth, continuous updates:

1. **Timeline (Hidden Buffer)**: Items are fetched in batches and added to a timeline with their actual HN creation timestamps
2. **Render Marker (Playback Head)**: Moves forward in real-time but starts 30-60 seconds behind "now"
3. **Display**: As the render marker passes each item's timestamp, that item appears in the UI

This approach:
- Shows items at their **actual posting rate** (preserving real velocity of HN activity)
- Creates **continuous smooth updates** instead of bursts
- Works even during slow periods (marker catches up) or busy periods (items queue naturally)
- No artificial delays - the delay is just the initial offset

### Visual Representation
```
Timeline:        |----[item1]--[item2]--------[item3][item4]--[item5]-------> NOW
                                                        ^
Render Marker:   |--------------------------------[MARKER]------------------> NOW
                 (60s ago)                          (displays items as it passes them)

User sees items appear as the marker reaches them, maintaining real posting velocity
```

## Hooks

### useMaxItemListener (src/hooks/useMaxItemListener.ts)
**Purpose**: Fetch new items from HN and add them to the timeline buffer

- Listen to Firebase `/v0/maxitem` using `onValue()`
- Track previous maxId in a ref
- When maxId changes, calculate delta: `itemsToCheck = [prevMaxId + 1 ... newMaxId]`
- Fetch all items in range in parallel
- **Include ALL item types** (stories, comments, jobs, polls, pollopts)
- Add items to timeline buffer with their actual HN timestamps (from `item.time`)
- Clean up Firebase listener on unmount

**Key behaviors:**
- On initial load, fetch the last 50 items to populate the timeline buffer
- After initialization, only process deltas (new items)
- Handle large deltas gracefully (limit to last 50 items if delta > 50)
- Filter out null/deleted/dead items via `getItemsBatch`
- Return `loading` state for initial fetch
- **Return timeline buffer (not display items)** - items with timestamps

### useTimelineRenderer (src/hooks/useTimelineRenderer.ts)
**NEW HOOK - Core of the timeline rendering system**

**Purpose**: Manage the render marker and convert timeline items to displayed items

**State:**
- `timeline`: Array of items with timestamps (from `useMaxItemListener`)
- `displayedItems`: Items currently visible to user
- `renderMarkerTime`: Current position of render marker (Unix timestamp in seconds)
- `timelineStartOffset`: Configurable delay (default: 60 seconds)

**Algorithm:**
```typescript
1. Initialize render marker = NOW - timelineStartOffset (60s ago)
2. Every second (using setInterval):
   a. Move render marker forward by 1 second: renderMarkerTime += 1
   b. Find all timeline items where: item.time <= renderMarkerTime
   c. Move those items from timeline to displayedItems (prepend to top)
   d. Remove moved items from timeline buffer
3. When new items arrive in timeline:
   - Add them to timeline buffer (sorted by timestamp)
   - They'll naturally be displayed when marker reaches them
```

**Key behaviors:**
- Render marker advances in **real-time** (1 second per second)
- Items appear **at their actual posting rate** (maintaining HN's velocity)
- **Marker maintains constant offset**: Since items arrive with current timestamps and marker moves at real-time speed, the 60-second delay is preserved indefinitely
- During slow periods: fewer items in timeline buffer, but offset remains constant
- During busy periods: more items queue in timeline, marker shows them at their actual rate
- Initial offset ensures buffer is pre-populated before display starts
- Handles edge cases:
  - Tab visibility: Pause marker when tab hidden (optional)
  - Marker catching up: Only happens if HN has NO new items for 60+ seconds (extremely rare)
  - Timeline overflow: Limit buffer to 100 items

**Return values:**
```typescript
{
  displayedItems: Item[],           // Items visible to user (newest first)
  renderMarkerTime: number,         // Current marker position (for debugging)
  timelinePending: number,          // Count of items waiting in timeline
  isLive: boolean,                  // True if marker caught up to NOW
}
```

### useLiveStories (src/hooks/useLiveStories.ts)
**Purpose**: Integrate timeline system and manage visited status

- Integrate `useMaxItemListener` to get timeline buffer
- Integrate `useTimelineRenderer` to get displayed items
- Mark stories as visited if they're in localStorage (same as before)
- Limit to 200 displayed items max to prevent memory issues
- Return displayed items, loading, and error states

**Data flow:**
```
Firebase → useMaxItemListener → timeline buffer → useTimelineRenderer → displayedItems → useLiveStories → UI
```

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
- Use `useLiveStories` hook to get displayed items
- Display items in reverse chronological order (newest first)
- Uses `.comments-list` container for comment-style spacing
- **No numbering** - continuous feed without item numbers
- **No pagination** - accumulates up to 200 items
- **No notification banner or button** - items appear automatically as marker advances
- Uses `LiveItemDisplay` component for rendering
- **Optional**: Show debug info (render marker position, pending items count, isLive status)

**Layout:**
```jsx
<div className="stories-page">
  <h1>Hacker News Live</h1>

  {/* Optional debug info - remove in production */}
  <div className="live-debug-info">
    Marker: {new Date(renderMarkerTime * 1000).toLocaleTimeString()} |
    Pending: {timelinePending} |
    {isLive ? '🔴 LIVE' : '⏸️ Catching up'}
  </div>

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

### Timeline System Edge Cases
1. **Large deltas:** If delta > 50 items since last check, only fetch last 50
2. **Marker catching up to NOW (rare):**
   - Only occurs if HN has NO new items for 60+ seconds (extremely rare)
   - When `renderMarkerTime >= Math.floor(Date.now() / 1000)`, marker stops advancing
   - Set `isLive = true` to indicate we're caught up
   - When new items arrive, marker resumes advancing from current position
   - Items will appear immediately (no delay) until buffer rebuilds to 60 seconds
3. **Items arriving out of order:**
   - Timeline buffer should be kept sorted by `item.time`
   - When adding new items, insert in correct position (not just append)
   - This is rare but can happen with HN's eventual consistency
4. **Initial load timing:**
   - Fetch last 50 items to populate timeline buffer
   - Find the oldest item timestamp in the fetched batch
   - Set marker to `oldestItemTime` (marker starts at oldest item)
   - This ensures smooth playback from the beginning with 60-second buffer naturally building
5. **Tab visibility:**
   - Pause marker advancement when tab is hidden (using Page Visibility API)
   - Resume from same position when tab becomes visible
   - This prevents items from "piling up" while user is away
   - Timeline buffer may accumulate items during pause (up to 100 item limit)
6. **Slow periods (low activity):**
   - Timeline buffer has fewer items (maybe 5-10 items)
   - Marker still maintains ~60 second offset from NOW
   - Items appear at their natural slow rate (e.g., one every 2-3 minutes)
   - User sees the real velocity of HN activity
7. **Busy periods (high activity):**
   - Timeline buffer accumulates more items (maybe 30-50 items)
   - Marker still maintains ~60 second offset from NOW
   - Items appear at their natural fast rate (e.g., several per minute)
   - Timeline buffer limit: 100 items (if exceeded, drop oldest buffered items)
8. **User leaves tab open for hours:**
   - Marker continues advancing as long as tab is visible
   - Timeline buffer naturally maintains ~60 second offset
   - Displayed items list is capped at 200, oldest items are removed
   - System remains stable indefinitely

### General Edge Cases
8. **Connection loss:** Firebase SDK handles reconnection automatically
9. **Deleted/dead items:** Filter out via `getItemsBatch` before adding to timeline
10. **All item types:** Display stories, comments, jobs, polls, pollopts - no filtering
11. **Memory management:** Limit to 200 displayed items, removes oldest when exceeded
12. **Clicking stories:** Use same `markStoryAsVisited` and navigation as regular mode
13. **Comment parent links:** External links to HN for parent and full thread context

## Implementation Order

### Phase 1: Original Implementation (Completed)
1. ✅ **Add Firebase SDK** - Install package, create firebase.ts service
2. ✅ **Create useMaxItemListener hook** - Firebase listener with delta detection, initial load
3. ✅ **Enhance API** - Add batch fetching (`getItemsBatch`, `getMaxItemId`)
4. ✅ **Create useLiveStories hook** - Integrate listener, manage items state
5. ✅ **Create LiveItemDisplay component** - Display all item types appropriately
6. ✅ **Create LiveStoriesPage component** - UI for live feed
7. ✅ **Add CSS animations** - Smooth insertion effects
8. ✅ **Update App.tsx** - Add route and header link
9. ✅ **Add comment links** - Parent and "on HN" links for comments

### Phase 2: Timeline System (New)
1. **Refactor useMaxItemListener**:
   - Change from returning `newItems` to maintaining a `timelineBuffer`
   - Keep items sorted by `item.time` (Unix timestamp)
   - Change initial fetch from 30 to 50 items
   - Return timeline buffer instead of cumulative items

2. **Create useTimelineRenderer hook**:
   - Accept timeline buffer from `useMaxItemListener`
   - Initialize render marker with 60-second offset
   - Set up 1-second interval to advance marker
   - Move items from timeline to displayedItems when marker passes
   - Handle marker catching up to NOW
   - Implement Page Visibility API to pause/resume
   - Return displayedItems, renderMarkerTime, timelinePending, isLive

3. **Refactor useLiveStories**:
   - Integrate both `useMaxItemListener` and `useTimelineRenderer`
   - Apply visited status marking to displayedItems
   - Limit displayedItems to 200 max
   - Pass through timeline renderer values

4. **Update LiveStoriesPage**:
   - Accept new values from useLiveStories
   - Add debug info display (optional, dev only)
   - Same UI otherwise

5. **Testing**:
   - Verify smooth continuous updates during various activity levels
   - Test marker catch-up behavior
   - Test tab visibility pausing
   - Verify items appear at correct rate

## Success Criteria

### Original Goals (Completed)
- ✅ All item types appear automatically without refresh (stories, comments, jobs, polls)
- ✅ Smooth slide-in animation with highlight flash when items are inserted
- ✅ Uses existing app styles (comment-style layout for consistency)
- ✅ Works in both light and dark mode
- ✅ Stories are clickable and navigate to detail view
- ✅ Comments show parent link and "on HN" link for context
- ✅ No polling - uses Firebase real-time listeners
- ✅ Handles connection issues gracefully (Firebase SDK)
- ✅ Clean, minimal UI - no numbering, no pagination, no buttons
- ✅ Memory management - limits to 200 items

### New Timeline System Goals
- ⏳ **Continuous smooth updates** - items appear individually at their actual posting rate
- ⏳ **No burst effect** - items from batch fetches are spread out naturally by their timestamps
- ⏳ **Real velocity preserved** - slow periods feel slow, busy periods feel busy
- ⏳ **Marker system works** - 60-second offset is maintained indefinitely during normal operation
- ⏳ **Constant offset maintained** - marker stays ~60 seconds behind NOW as items continuously arrive
- ⏳ **Tab visibility** - pauses when hidden, resumes smoothly without bursts
- ⏳ **Timeline buffer management** - limited to 100 pending items
- ⏳ **Rare catch-up handling** - gracefully handles the unlikely case of 60+ seconds with no HN activity
