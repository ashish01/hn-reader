import { useState, useEffect, useCallback } from 'react';
import { getStory, getComment } from '../api/hackernews';
import { Story, Comment } from '../types';
import { markStoryAsVisited } from '../utils/visitedStories';

interface CommentWithChildren extends Comment {
  children?: CommentWithChildren[];
  isExpanded?: boolean;
  childrenLoaded?: boolean;
}

// Helper functions for localStorage
const getCommentKey = (storyId: number, commentId: number) => `hn-comment-${storyId}-${commentId}`;

const getStoredCommentState = (storyId: number, commentId: number): boolean | null => {
  try {
    const key = getCommentKey(storyId, commentId);
    const storedValue = localStorage.getItem(key);
    return storedValue !== null ? storedValue === 'true' : null;
  } catch (e) {
    console.error('Error reading from localStorage:', e);
    return null;
  }
};

const saveCommentState = (storyId: number, commentId: number, isExpanded: boolean) => {
  try {
    const key = getCommentKey(storyId, commentId);
    localStorage.setItem(key, isExpanded.toString());
  } catch (e) {
    console.error('Error writing to localStorage:', e);
  }
};

export const useStoryWithComments = (storyId: number) => {
  const [story, setStory] = useState<Story | null>(null);
  const [comments, setComments] = useState<CommentWithChildren[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingComments, setLoadingComments] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  // Function to recursively find a comment by ID in the nested structure
  const findCommentById = useCallback((commentId: number, commentsArray: CommentWithChildren[]): CommentWithChildren | null => {
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
  }, []);

  // Function to update a comment in the nested structure
  const updateCommentInTree = useCallback((
    commentId: number, 
    updateFn: (comment: CommentWithChildren) => CommentWithChildren, 
    commentsArray: CommentWithChildren[]
  ): CommentWithChildren[] => {
    return commentsArray.map(comment => {
      // If this is the comment we want to update
      if (comment.id === commentId) {
        return updateFn(comment);
      }
      
      // If this comment has children, recursively update them
      if (comment.children && comment.children.length > 0) {
        return {
          ...comment,
          children: updateCommentInTree(commentId, updateFn, comment.children)
        };
      }
      
      // Otherwise, return the comment unchanged
      return comment;
    });
  }, []);

  // Fetch the story first, then its comments
  useEffect(() => {
    let isMounted = true;
    
    const fetchStory = async () => {
      try {
        setLoading(true);
        
        // First fetch just the story
        const fetchedStory = await getStory(storyId);
        
        if (!isMounted) return;
        
        // Mark story as visited
        markStoryAsVisited(storyId);
        
        setStory(fetchedStory);
        setLoading(false);
        
        // Then fetch its comments
        setLoadingComments(true);
        
        if (!fetchedStory.kids || fetchedStory.kids.length === 0) {
          setComments([]);
          setLoadingComments(false);
          return;
        }
        
        // Initialize comments array with placeholders to maintain order
        const commentsMap = new Map<number, CommentWithChildren>();

        // Fetch all comments in parallel
        const commentPromises = fetchedStory.kids.map(async (kidId, index) => {
          try {
            const comment = await getComment(kidId);

            if (!isMounted) return;

            // Check localStorage for saved state
            const savedExpanded = getStoredCommentState(storyId, kidId);

            // Add UI state properties - use saved state or default to true
            const commentWithState = {
              ...comment,
              isExpanded: savedExpanded !== null ? savedExpanded : true,
              childrenLoaded: false,
              children: []
            };

            // Store in map with original index
            commentsMap.set(index, commentWithState);

            // Update comments in order as they arrive
            setComments(() => {
              const orderedComments: CommentWithChildren[] = [];
              for (let i = 0; i < fetchedStory.kids.length; i++) {
                const comment = commentsMap.get(i);
                if (comment) {
                  orderedComments.push(comment);
                }
              }
              return orderedComments;
            });
          } catch (err) {
            console.error(`Error fetching comment ${kidId}:`, err);
          }
        });

        // Wait for all comments to complete
        await Promise.all(commentPromises);
        
        if (!isMounted) return;
        setLoadingComments(false);
      } catch (err) {
        if (!isMounted) return;
        setError(err instanceof Error ? err : new Error('An error occurred'));
        setLoading(false);
        setLoadingComments(false);
      }
    };

    fetchStory();
    
    return () => {
      isMounted = false;
    };
  }, [storyId]);

  // Function to toggle comment expansion and save to localStorage
  const toggleComment = useCallback((commentId: number) => {
    setComments(prevComments => {
      // Find current state to determine new state
      const comment = findCommentById(commentId, prevComments);
      const newExpandedState = comment ? !comment.isExpanded : false;
      
      // Save to localStorage
      saveCommentState(storyId, commentId, newExpandedState);
      
      return updateCommentInTree(
        commentId,
        comment => ({ ...comment, isExpanded: newExpandedState }),
        prevComments
      );
    });
  }, [updateCommentInTree, findCommentById, storyId]);

  // Function to load children for a comment
  const loadCommentChildren = useCallback(async (commentId: number) => {
    try {
      // Find the comment in our tree structure
      const commentToUpdate = findCommentById(commentId, comments);
      
      if (!commentToUpdate) return;
      
      // Skip if already loaded
      if (commentToUpdate.childrenLoaded) return;
      
      // Mark as loading
      setComments(prevComments => 
        updateCommentInTree(
          commentId,
          comment => ({
            ...comment,
            childrenLoaded: false,
            isLoading: true
          }),
          prevComments
        )
      );
      
      // Get the children IDs
      const kidIds = commentToUpdate.kids || [];

      // Map to track children by their original index
      const childrenMap = new Map<number, CommentWithChildren>();

      // Fetch all children in parallel
      const childPromises = kidIds.map(async (kidId, index) => {
        try {
          const childComment = await getComment(kidId);

          // Skip if null or deleted
          if (!childComment) return;

          // Check localStorage for saved state
          const savedExpanded = getStoredCommentState(storyId, kidId);

          // Transform to add UI state - use saved state or default to true
          const childWithState = {
            ...childComment,
            isExpanded: savedExpanded !== null ? savedExpanded : true,
            childrenLoaded: false,
            children: []
          };

          // Store in map with original index
          childrenMap.set(index, childWithState);

          // Update children in order as they arrive
          setComments(prevComments =>
            updateCommentInTree(
              commentId,
              comment => {
                const orderedChildren: CommentWithChildren[] = [];
                for (let i = 0; i < kidIds.length; i++) {
                  const child = childrenMap.get(i);
                  if (child) {
                    orderedChildren.push(child);
                  }
                }
                return {
                  ...comment,
                  children: orderedChildren
                };
              },
              prevComments
            )
          );
        } catch (err) {
          console.error(`Error loading comment ${kidId}:`, err);
        }
      });

      // Wait for all children to complete
      await Promise.all(childPromises);
      
      // Mark as finished loading
      setComments(prevComments => 
        updateCommentInTree(
          commentId,
          comment => ({
            ...comment,
            childrenLoaded: true,
            isLoading: false
          }),
          prevComments
        )
      );
      
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to load comment children'));
    }
  }, [storyId, comments, findCommentById, updateCommentInTree]);

  return { 
    story, 
    comments, 
    loading, 
    loadingComments,
    error, 
    toggleComment, 
    loadCommentChildren 
  };
};

export default useStoryWithComments;