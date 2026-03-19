import { create } from "zustand";

const DARK_MODE_KEY = "darkMode";

// One-time cleanup of legacy visited-stories data
try {
  localStorage.removeItem("hn-visited-stories");
} catch {
  // ignore
}

interface AppState {
  darkMode: boolean;
  setDarkMode: (value: boolean) => void;
  toggleDarkMode: () => void;
}

const readDarkMode = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    const savedMode = localStorage.getItem(DARK_MODE_KEY);
    if (savedMode !== null) {
      return savedMode === "true";
    }
    // Fall back to OS preference
    return (
      window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false
    );
  } catch (error) {
    console.error("Error reading dark mode from localStorage:", error);
    return false;
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
  setDarkMode: (value) => {
    set({ darkMode: value });
    writeDarkMode(value);
  },
  toggleDarkMode: () => {
    const nextValue = !get().darkMode;
    set({ darkMode: nextValue });
    writeDarkMode(nextValue);
  },
}));

export default useAppStore;
