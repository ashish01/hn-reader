import { create } from "zustand";
import { getStory, getComment } from "../api/hackernews";
import { Story, Comment } from "../types";
import useAppStore from "./useAppStore";

interface CommentWithChildren extends Comment {
  children?: CommentWithChildren[];
  isExpanded?: boolean;
  childrenLoaded?: boolean;
  isLoading?: boolean;
}

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

const getCommentKey = (storyId: number, commentId: number) =>
  `hn-comment-${storyId}-${commentId}`;

const getStoredCommentState = (
  storyId: number,
  commentId: number,
): boolean | null => {
  try {
    const key = getCommentKey(storyId, commentId);
    const storedValue = localStorage.getItem(key);
    return storedValue !== null ? storedValue === "true" : null;
  } catch (error) {
    console.error("Error reading from localStorage:", error);
    return null;
  }
};

const saveCommentState = (
  storyId: number,
  commentId: number,
  isExpanded: boolean,
) => {
  try {
    const key = getCommentKey(storyId, commentId);
    localStorage.setItem(key, isExpanded.toString());
  } catch (error) {
    console.error("Error writing to localStorage:", error);
  }
};

const findCommentById = (
  commentId: number,
  commentsArray: CommentWithChildren[],
): CommentWithChildren | null => {
  for (const comment of commentsArray) {
    if (comment.id === commentId) {
      return comment;
    }

    if (comment.children && comment.children.length > 0) {
      const foundInChildren = findCommentById(commentId, comment.children);
      if (foundInChildren) {
        return foundInChildren;
      }
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

let storyRequestId = 0;

const useStoryWithCommentsStore = create<StoryWithCommentsState>((set, get) => ({
  story: null,
  comments: [],
  loading: true,
  loadingComments: true,
  error: null,
  currentStoryId: null,
  fetchStoryWithComments: async (storyId: number) => {
    const requestId = ++storyRequestId;
    set({
      story: null,
      comments: [],
      loading: true,
      loadingComments: true,
      error: null,
      currentStoryId: storyId,
    });

    try {
      const fetchedStory = await getStory(storyId);
      if (requestId !== storyRequestId) return;

      useAppStore.getState().markStoryVisited(storyId);

      set({
        story: fetchedStory,
        loading: false,
      });

      set({ loadingComments: true });

      if (!fetchedStory.kids || fetchedStory.kids.length === 0) {
        set({ comments: [], loadingComments: false });
        return;
      }

      const commentsMap = new Map<number, CommentWithChildren>();

      const commentPromises = fetchedStory.kids.map(async (kidId) => {
        try {
          const comment = await getComment(kidId);
          if (requestId !== storyRequestId) return;

          const savedExpanded = getStoredCommentState(storyId, kidId);

          const commentWithState: CommentWithChildren = {
            ...comment,
            isExpanded: savedExpanded !== null ? savedExpanded : true,
            childrenLoaded: false,
            children: [],
          };

          commentsMap.set(kidId, commentWithState);
        } catch (err) {
          console.error(`Error fetching comment ${kidId}:`, err);
        }
      });

      await Promise.all(commentPromises);
      if (requestId !== storyRequestId) return;

      const orderedComments: CommentWithChildren[] = [];
      for (const kid of fetchedStory.kids) {
        const comment = commentsMap.get(kid);
        if (comment) {
          orderedComments.push(comment);
        }
      }

      set({ comments: orderedComments, loadingComments: false });
    } catch (err) {
      if (requestId !== storyRequestId) return;
      set({
        error: err instanceof Error ? err : new Error("An error occurred"),
        loading: false,
        loadingComments: false,
      });
    }
  },
  toggleComment: (commentId: number) => {
    const { comments, currentStoryId } = get();
    if (currentStoryId === null) return;

    const comment = findCommentById(commentId, comments);
    const newExpandedState = comment ? !comment.isExpanded : false;

    saveCommentState(currentStoryId, commentId, newExpandedState);

    set((state) => ({
      comments: updateCommentInTree(
        commentId,
        (current) => ({ ...current, isExpanded: newExpandedState }),
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
          (comment) => ({
            ...comment,
            childrenLoaded: false,
            isLoading: true,
          }),
          state.comments,
        ),
      }));

      const kidIds = commentToUpdate.kids || [];
      const childrenMap = new Map<number, CommentWithChildren>();

      const childPromises = kidIds.map(async (kidId) => {
        try {
          const childComment = await getComment(kidId);
          if (!childComment) return;

          const savedExpanded = getStoredCommentState(currentStoryId, kidId);
          const childWithState: CommentWithChildren = {
            ...childComment,
            isExpanded: savedExpanded !== null ? savedExpanded : true,
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
        if (child) {
          orderedChildren.push(child);
        }
      }

      set((state) => ({
        comments: updateCommentInTree(
          commentId,
          (comment) => ({
            ...comment,
            children: orderedChildren,
          }),
          state.comments,
        ),
      }));

      set((state) => ({
        comments: updateCommentInTree(
          commentId,
          (comment) => ({
            ...comment,
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
}));

export default useStoryWithCommentsStore;
