import { create } from "zustand";
import { getStory, getComment } from "../api/hackernews";
import { Story, CommentWithChildren } from "../types";

const COMMENT_STATE_PREFIX = "hn-comments-";
const MAX_STORED_STORIES = 50;
type CommentStateMap = Record<number, boolean>;

const getStoryCommentStates = (storyId: number): CommentStateMap => {
  try {
    const raw = sessionStorage.getItem(`${COMMENT_STATE_PREFIX}${storyId}`);
    const value = raw ? JSON.parse(raw) : {};
    return value && typeof value === "object" ? value : {};
  } catch {
    return {};
  }
};

const saveStoryCommentStates = (storyId: number, states: CommentStateMap) => {
  try {
    const currentKey = `${COMMENT_STATE_PREFIX}${storyId}`;
    sessionStorage.setItem(currentKey, JSON.stringify(states));
    const keys = Object.keys(sessionStorage).filter((key) =>
      key.startsWith(COMMENT_STATE_PREFIX),
    );
    keys.filter((key) => key !== currentKey)
      .slice(0, Math.max(0, keys.length - MAX_STORED_STORIES))
      .forEach((key) => sessionStorage.removeItem(key));
  } catch {
    // Reading comments remains available when storage is full or disabled.
  }
};

const findCommentById = (
  id: number,
  comments: CommentWithChildren[],
): CommentWithChildren | undefined => {
  for (const comment of comments) {
    if (comment.id === id) return comment;
    const child = findCommentById(id, comment.children ?? []);
    if (child) return child;
  }
};

const updateCommentInTree = (
  id: number,
  update: (comment: CommentWithChildren) => CommentWithChildren,
  comments: CommentWithChildren[],
): CommentWithChildren[] => {
  let changed = false;
  const next = comments.map((comment) => {
    if (comment.id === id) {
      changed = true;
      return update(comment);
    }
    if (!comment.children) return comment;
    const children = updateCommentInTree(id, update, comment.children);
    if (children === comment.children) return comment;
    changed = true;
    return { ...comment, children };
  });
  return changed ? next : comments;
};

interface StoryWithCommentsState {
  story: Story | null;
  comments: CommentWithChildren[];
  loading: boolean;
  loadingComments: boolean;
  commentsError: string | null;
  error: Error | null;
  currentStoryId: number | null;
  fetchStoryWithComments: (storyId: number) => Promise<void>;
  retryComments: () => Promise<void>;
  cancel: () => void;
  toggleComment: (commentId: number) => void;
  loadCommentChildren: (commentId: number) => Promise<void>;
}

const useStoryWithCommentsStore = create<StoryWithCommentsState>((set, get) => {
  let generation = 0;
  let controller: AbortController | null = null;

  // Merge each arrival into current state; retries request only missing IDs.
  const loadComments = async (parentId: number | null) => {
    const state = get();
    const storyId = state.currentStoryId;
    const abort = controller;
    const request = generation;
    if (storyId === null || !abort || abort.signal.aborted) return;
    const parent = parentId === null ? null : findCommentById(parentId, state.comments);
    if (parentId !== null && (!parent || parent.isLoading || parent.childrenLoaded)) return;
    if (parentId === null && state.loadingComments) return;

    const ids = (parentId === null ? state.story?.kids : parent?.kids) ?? [];
    const existing = parentId === null ? state.comments : parent?.children ?? [];
    const loadedIds = new Set(existing.map((comment) => comment.id));
    const missing = ids.filter((id) => !loadedIds.has(id));
    const isCurrent = () => request === generation && !abort.signal.aborted;
    const updateParent = (update: (comment: CommentWithChildren) => CommentWithChildren) => {
      if (parentId !== null) {
        set((current) => ({ comments: updateCommentInTree(parentId, update, current.comments) }));
      }
    };
    if (parentId === null) set({ loadingComments: true, commentsError: null });
    else updateParent((comment) => ({ ...comment, isLoading: true, childrenError: null }));

    let failed = 0;
    await Promise.all(missing.map(async (id) => {
      try {
        const item = await getComment(id, abort.signal);
        if (!isCurrent()) return;
        const saved = getStoryCommentStates(storyId)[id];
        const comment: CommentWithChildren = {
          ...item,
          isExpanded: typeof saved === "boolean" ? saved : true,
          childrenLoaded: false,
          children: [],
        };
        const merge = (current: CommentWithChildren[]) => {
          const byId = new Map(current.map((entry) => [entry.id, entry]));
          if (!byId.has(id)) byId.set(id, comment);
          return ids.flatMap((kid) => {
            const entry = byId.get(kid);
            return entry ? [entry] : [];
          });
        };
        if (parentId === null) set((current) => ({ comments: merge(current.comments) }));
        else updateParent((current) => ({ ...current, children: merge(current.children ?? []) }));
      } catch {
        if (isCurrent()) failed++;
      }
    }));
    if (!isCurrent()) return;
    const message = failed ? `${failed} ${parentId === null ? "comments" : "replies"} could not be loaded.` : null;
    if (parentId === null) set({ loadingComments: false, commentsError: message });
    else updateParent((comment) => ({
      ...comment,
      isLoading: false,
      childrenLoaded: failed === 0,
      childrenError: message,
    }));
  };

  return {
    story: null,
    comments: [],
    loading: true,
    loadingComments: false,
    commentsError: null,
    error: null,
    currentStoryId: null,
    cancel: () => {
      generation++;
      controller?.abort();
    },
    fetchStoryWithComments: async (storyId) => {
      get().cancel();
      const request = generation;
      const abort = new AbortController();
      controller = abort;
      set({ story: null, comments: [], loading: true, loadingComments: false,
        commentsError: null, error: null, currentStoryId: storyId });
      try {
        const story = await getStory(storyId, abort.signal);
        if (request !== generation) return;
        set({ story, loading: false });
        await loadComments(null);
      } catch (error) {
        if (request !== generation || abort.signal.aborted) return;
        set({ loading: false, error: error instanceof Error ? error : new Error("Failed to load story") });
      }
    },
    retryComments: () => loadComments(null),
    loadCommentChildren: (id) => loadComments(id),
    toggleComment: (id) => {
      const { comments, currentStoryId } = get();
      if (currentStoryId === null) return;
      const comment = findCommentById(id, comments);
      if (!comment) return;
      const expanded = !(comment.isExpanded ?? true);
      const saved = getStoryCommentStates(currentStoryId);
      saved[id] = expanded;
      saveStoryCommentStates(currentStoryId, saved);
      set({ comments: updateCommentInTree(id, (entry) => ({ ...entry, isExpanded: expanded }), comments) });
    },
  };
});

export default useStoryWithCommentsStore;
