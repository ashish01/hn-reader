import { useState, useEffect } from "react";
import {
  Routes,
  Route,
  useNavigate,
  useParams,
  useLocation,
  Link,
} from "react-router-dom";
import StoriesPage from "./components/StoriesPage";
import StoryPage from "./components/StoryPage";
import "./index.css";
import "./App.css";

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
    // Import is problematic (circular), so access localStorage directly
    try {
      const visitedStories = JSON.parse(
        localStorage.getItem("hn-visited-stories") || "[]",
      );
      if (!visitedStories.includes(id)) {
        visitedStories.push(id);
        localStorage.setItem(
          "hn-visited-stories",
          JSON.stringify(visitedStories),
        );

        // Dispatch a storage event so other components can react to this change
        window.dispatchEvent(
          new StorageEvent("storage", {
            key: "hn-visited-stories",
          }),
        );
      }
    } catch (e) {
      console.error("Error saving visited story to localStorage:", e);
    }

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
        <button className="theme-toggle" onClick={toggleDarkMode}>
          {darkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<StoriesRoute />} />
          <Route path="/story/:storyId" element={<StoryRoute />} />
        </Routes>
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
