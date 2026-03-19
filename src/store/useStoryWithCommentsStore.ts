import { create } from "zustand";
import { getStory, getComment } from "../api/hackernews";
import { Story, CommentWithChildren } from "../types";

// ── sessionStorage helpers for comment expand/collapse state ──

const COMMENT_STATE_PREFIX = "hn-comments-";
const MAX_STORED_STORIES = 50;

/**
 * All comment states for a story stored as a single JSON blob:
 * { [commentId]: boolean }
 */
type CommentStateMap = Record<number, boolean>;

const getStoryCommentStates = (storyId: number): CommentStateMap => {
  try {
    const raw = sessionStorage.getItem(`${COMMENT_STATE_PREFIX}${storyId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveStoryCommentStates = (
  storyId: number,
  states: CommentStateMap,
) => {
  try {
    sessionStorage.setItem(
      `${COMMENT_STATE_PREFIX}${storyId}`,
      JSON.stringify(states),
    );
    pruneOldStories(storyId);
  } catch {
    // sessionStorage full — ignore
  }
};

/** Keep only the most recent MAX_STORED_STORIES entries. */
const pruneOldStories = (currentStoryId: number) => {
  try {
    const keys: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(COMMENT_STATE_PREFIX)) {
        keys.push(key);
      }
    }
    if (keys.length <= MAX_STORED_STORIES) return;

    // Remove oldest entries (those that aren't the current story)
    const currentKey = `${COMMENT_STATE_PREFIX}${currentStoryId}`;
    const toRemove = keys
      .filter((k) => k !== currentKey)
      .slice(0, keys.length - MAX_STORED_STORIES);
    toRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // ignore
  }
};

// ── Tree helpers ──

const findCommentById = (
  commentId: number,
  commentsArray: CommentWithChildren[],
): CommentWithChildren | null => {
  for (const comment of commentsArray) {
    if (comment.id === commentId) {
      return comment;
    }
    if (comment.children && comment.children.length > 0) {
      const found = findCommentById(commentId, comment.children);
      if (found) return found;
    }
  }
  return null;
};

const updateCommentInTree = (
  commentId: number,
  updateFn: (comment: CommentWithChildren) => CommentWithChildren,
  commentsArray: CommentWithChildren[],
): CommentWithChildren[] =>
  commentsArray.map((comment) => {
    if (comment.id === commentId) {
      return updateFn(comment);
    }
    if (comment.children && comment.children.length > 0) {
      return {
        ...comment,
        children: updateCommentInTree(commentId, updateFn, comment.children),
      };
    }
    return comment;
  });

// ── Store ──

interface StoryWithCommentsState {
  story: Story | null;
  comments: CommentWithChildren[];
  loading: boolean;
  loadingComments: boolean;
  error: Error | null;
  currentStoryId: number | null;
  fetchStoryWithComments: (storyId: number) => Promise<void>;
  toggleComment: (commentId: number) => void;
  loadCommentChildren: (commentId: number) => Promise<void>;
}

const useStoryWithCommentsStore = create<StoryWithCommentsState>(
  (set, get) => {
    // Mutable state inside closure
    let requestId = 0;
    let currentAbort: AbortController | null = null;

    return {
      story: null,
      comments: [],
      loading: true,
      loadingComments: true,
      error: null,
      currentStoryId: null,

      fetchStoryWithComments: async (storyId: number) => {
        // Abort previous request
        if (currentAbort) {
          currentAbort.abort();
        }
        const abort = new AbortController();
        currentAbort = abort;
        const thisRequest = ++requestId;

        set({
          story: null,
          comments: [],
          loading: true,
          loadingComments: true,
          error: null,
          currentStoryId: storyId,
        });

        try {
          const fetchedStory = await getStory(storyId, abort.signal);
          if (thisRequest !== requestId) return;

          set({ story: fetchedStory, loading: false, loadingComments: true });

          if (!fetchedStory.kids || fetchedStory.kids.length === 0) {
            set({ comments: [], loadingComments: false });
            return;
          }

          const savedStates = getStoryCommentStates(storyId);
          const commentsMap = new Map<number, CommentWithChildren>();

          const commentPromises = fetchedStory.kids.map(async (kidId) => {
            try {
              const comment = await getComment(kidId, abort.signal);
              if (thisRequest !== requestId) return;

              const savedExpanded = savedStates[kidId];
              const commentWithState: CommentWithChildren = {
                ...comment,
                isExpanded:
                  savedExpanded !== undefined ? savedExpanded : true,
                childrenLoaded: false,
                children: [],
              };
              commentsMap.set(kidId, commentWithState);
            } catch (err) {
              if (
                err instanceof DOMException &&
                err.name === "AbortError"
              ) {
                throw err;
              }
              console.error(`Error fetching comment ${kidId}:`, err);
            }
          });

          await Promise.all(commentPromises);
          if (thisRequest !== requestId) return;

          const orderedComments: CommentWithChildren[] = [];
          for (const kid of fetchedStory.kids) {
            const comment = commentsMap.get(kid);
            if (comment) orderedComments.push(comment);
          }

          set({ comments: orderedComments, loadingComments: false });
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") {
            return;
          }
          if (thisRequest !== requestId) return;
          set({
            error:
              err instanceof Error
                ? err
                : new Error("An error occurred"),
            loading: false,
            loadingComments: false,
          });
        }
      },

      toggleComment: (commentId: number) => {
        const { comments, currentStoryId } = get();
        if (currentStoryId === null) return;

        const comment = findCommentById(commentId, comments);
        const newExpanded = comment ? !comment.isExpanded : false;

        // Save to sessionStorage (single blob per story)
        const states = getStoryCommentStates(currentStoryId);
        states[commentId] = newExpanded;
        saveStoryCommentStates(currentStoryId, states);

        set((state) => ({
          comments: updateCommentInTree(
            commentId,
            (c) => ({ ...c, isExpanded: newExpanded }),
            state.comments,
          ),
        }));
      },

      loadCommentChildren: async (commentId: number) => {
        const { comments, currentStoryId } = get();
        if (currentStoryId === null) return;
        const activeStoryId = currentStoryId;

        try {
          const commentToUpdate = findCommentById(commentId, comments);
          if (!commentToUpdate || commentToUpdate.childrenLoaded) return;

          set((state) => ({
            comments: updateCommentInTree(
              commentId,
              (c) => ({ ...c, childrenLoaded: false, isLoading: true }),
              state.comments,
            ),
          }));

          const kidIds = commentToUpdate.kids || [];
          const savedStates = getStoryCommentStates(activeStoryId);
          const childrenMap = new Map<number, CommentWithChildren>();

          const childPromises = kidIds.map(async (kidId) => {
            try {
              const childComment = await getComment(kidId);
              if (!childComment) return;

              const savedExpanded = savedStates[kidId];
              const childWithState: CommentWithChildren = {
                ...childComment,
                isExpanded:
                  savedExpanded !== undefined ? savedExpanded : true,
                childrenLoaded: false,
                children: [],
              };
              childrenMap.set(kidId, childWithState);
            } catch (err) {
              console.error(`Error loading comment ${kidId}:`, err);
            }
          });

          await Promise.all(childPromises);
          if (activeStoryId !== get().currentStoryId) return;

          const orderedChildren: CommentWithChildren[] = [];
          for (const kid of kidIds) {
            const child = childrenMap.get(kid);
            if (child) orderedChildren.push(child);
          }

          set((state) => ({
            comments: updateCommentInTree(
              commentId,
              (c) => ({
                ...c,
                children: orderedChildren,
                childrenLoaded: true,
                isLoading: false,
              }),
              state.comments,
            ),
          }));
        } catch (err) {
          set({
            error:
              err instanceof Error
                ? err
                : new Error("Failed to load comment children"),
          });
        }
      },
    };
  },
);

export default useStoryWithCommentsStore;
