import { useState, useEffect, lazy, Suspense } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
  Link,
} from "react-router-dom";
import { markStoryAsVisited } from "./utils/visitedStories";
import "./index.css";
import "./App.css";

// Lazy load page components for code splitting
const StoriesPage = lazy(() => import("./components/StoriesPage"));
const StoryPage = lazy(() => import("./components/StoryPage"));
const LiveStoriesPage = lazy(() => import("./components/LiveStoriesPage"));

// Story component with router params
function StoryRoute() {
  const { storyId } = useParams<{ storyId: string }>();
  const navigate = useNavigate();

  const handleBackToStories = () => {
    navigate("/");
  };

  return (
    <StoryPage
      storyId={parseInt(storyId || "0", 10)}
      onBack={handleBackToStories}
    />
  );
}

// Stories page with pagination
function StoriesRoute() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const pageParam = queryParams.get("page");
  const currentPage = pageParam ? parseInt(pageParam, 10) : 0;

  const handleStorySelect = (id: number) => {
    markStoryAsVisited(id);
    navigate(`/story/${id}`);
  };

  const handlePageChange = (page: number) => {
    navigate(`/?page=${page}`);
  };

  return (
    <StoriesPage
      onStorySelect={handleStorySelect}
      page={currentPage}
      onPageChange={handlePageChange}
    />
  );
}

// Live stories page
function LiveStoriesRoute() {
  const navigate = useNavigate();

  const handleStorySelect = (id: number) => {
    markStoryAsVisited(id);
    navigate(`/story/${id}`);
  };

  return <LiveStoriesPage onStorySelect={handleStorySelect} />;
}

function App() {
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    // Check for saved preference or default to false
    const savedMode = localStorage.getItem("darkMode");
    return savedMode === "true";
  });

  // Apply dark mode class to the body
  useEffect(() => {
    if (darkMode) {
      document.body.classList.add("dark-mode");
    } else {
      document.body.classList.remove("dark-mode");
    }

    // Save preference to localStorage
    localStorage.setItem("darkMode", darkMode.toString());
  }, [darkMode]);

  const toggleDarkMode = () => {
    setDarkMode((prev) => !prev);
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1 className="app-title">
          <Link to="/">HN Reader</Link>
        </h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="theme-toggle" onClick={toggleDarkMode}>
            {darkMode ? "Light Mode" : "Dark Mode"}
          </button>
          <Link to="/live" className="theme-toggle">
            Live Mode
          </Link>
        </div>
      </header>

      <main>
        <Suspense fallback={<div style={{ padding: '20px', textAlign: 'center' }}>Loading...</div>}>
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
