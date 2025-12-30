import { create } from "zustand";

const VISITED_STORIES_KEY = "hn-visited-stories";
const DARK_MODE_KEY = "darkMode";

interface AppState {
  darkMode: boolean;
  visitedStoryIds: number[];
  setDarkMode: (value: boolean) => void;
  toggleDarkMode: () => void;
  markStoryVisited: (id: number) => void;
}

const readVisitedStoryIds = (): number[] => {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const visitedString = localStorage.getItem(VISITED_STORIES_KEY);
    return visitedString ? JSON.parse(visitedString) : [];
  } catch (error) {
    console.error("Error reading visited stories from localStorage:", error);
    return [];
  }
};

const readDarkMode = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const savedMode = localStorage.getItem(DARK_MODE_KEY);
    return savedMode === "true";
  } catch (error) {
    console.error("Error reading dark mode from localStorage:", error);
    return false;
  }
};

const writeVisitedStoryIds = (ids: number[]) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(VISITED_STORIES_KEY, JSON.stringify(ids));
  } catch (error) {
    console.error("Error saving visited stories to localStorage:", error);
  }
};

const writeDarkMode = (value: boolean) => {
  if (typeof window === "undefined") {
    return;
  }
  try {
    localStorage.setItem(DARK_MODE_KEY, value.toString());
  } catch (error) {
    console.error("Error saving dark mode to localStorage:", error);
  }
};

const useAppStore = create<AppState>((set, get) => ({
  darkMode: readDarkMode(),
  visitedStoryIds: readVisitedStoryIds(),
  setDarkMode: (value) => {
    set({ darkMode: value });
    writeDarkMode(value);
  },
  toggleDarkMode: () => {
    const nextValue = !get().darkMode;
    set({ darkMode: nextValue });
    writeDarkMode(nextValue);
  },
  markStoryVisited: (id) => {
    const current = get().visitedStoryIds;
    if (current.includes(id)) {
      return;
    }
    const next = [...current, id];
    set({ visitedStoryIds: next });
    writeVisitedStoryIds(next);
  },
}));

export default useAppStore;
