import { useEffect, lazy, Suspense } from "react";
import {
  Routes,
  Route,
  useParams,
  useLocation,
  Link,
} from "react-router-dom";
import useAppStore from "./store/useAppStore";
import "./index.css";
import "./App.css";

// Lazy load page components for code splitting
const StoriesPage = lazy(() => import("./components/StoriesPage"));
const StoryPage = lazy(() => import("./components/StoryPage"));
const LiveStoriesPage = lazy(() => import("./components/LiveStoriesPage"));

const parseNonNegativeInt = (value: string | null, fallback = 0): number => {
  if (value === null || value.trim() === "") {
    return fallback;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};

// Story component with router params
function StoryRoute() {
  const { storyId } = useParams<{ storyId: string }>();
  const parsedStoryId = storyId ? Number(storyId) : NaN;

  if (!Number.isInteger(parsedStoryId) || parsedStoryId <= 0) {
    return <div className="error">Invalid story id</div>;
  }

  return <StoryPage storyId={parsedStoryId} />;
}

// Stories page with pagination
function StoriesRoute() {
  const markStoryVisited = useAppStore((state) => state.markStoryVisited);
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const currentPage = parseNonNegativeInt(queryParams.get("page"));

  const handleStorySelect = (id: number) => {
    markStoryVisited(id);
  };

  return (
    <StoriesPage
      onStorySelect={handleStorySelect}
      page={currentPage}
    />
  );
}

// Live stories page
function LiveStoriesRoute() {
  const markStoryVisited = useAppStore((state) => state.markStoryVisited);

  const handleStorySelect = (id: number) => {
    markStoryVisited(id);
  };

  return <LiveStoriesPage onStorySelect={handleStorySelect} />;
}

function App() {
  const darkMode = useAppStore((state) => state.darkMode);
  const toggleDarkMode = useAppStore((state) => state.toggleDarkMode);

  // Apply dark mode class to the body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }
  }, [darkMode]);

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <Link to="/">HN Reader</Link>
        </h1>
        <div className="app-header-actions">
          <button type="button" className="theme-toggle" onClick={toggleDarkMode}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
          <Link to="/live" className="theme-toggle">
            Live Mode
          </Link>
        </div>
      </header>

      <main>
        <Suspense fallback={<div className="app-loading-fallback">Loading...</div>}>
          <Routes>
            <Route path="/" element={<StoriesRoute />} />
            <Route path="/live" element={<LiveStoriesRoute />} />
            <Route path="/story/:storyId" element={<StoryRoute />} />
          </Routes>
        </Suspense>
      </main>

      <footer className="app-footer">
        <p>
          Powered by{" "}
          <a
            href="https://github.com/HackerNews/API"
            target="_blank"
            rel="noopener noreferrer"
          >
            Hacker News API
          </a>
          {" | "}
          <a
            href="https://github.com/ashish01/hn-reader"
            target="_blank"
            rel="noopener noreferrer"
          >
            GitHub
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;
