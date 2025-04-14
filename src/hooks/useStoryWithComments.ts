import { useState, useEffect, useCallback } from 'react';
import { getStory, getComment } from '../api/hackernews';
import { Story, Comment } from '../types';
import { markStoryAsVisited } from './useStories';

interface CommentWithChildren extends Comment {
  children?: CommentWithChildren[];
  isExpanded?: boolean;
  childrenLoaded?: boolean;
}

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
        
        // Fetch each comment individually to show them as they load
        const commentPromises = fetchedStory.kids.map(async (kidId) => {
          try {
            const comment = await getComment(kidId);
            
            if (!isMounted) return null;
            
            // Add UI state properties
            const commentWithState = {
              ...comment,
              isExpanded: true,
              childrenLoaded: false,
              children: []
            };
            
            // Update the comments state with this new comment
            setComments(prevComments => {
              const newComments = [...prevComments];
              // Find the index of this comment if it exists already
              const existingIndex = newComments.findIndex(c => c.id === comment.id);
              
              if (existingIndex >= 0) {
                // Update existing comment
                newComments[existingIndex] = commentWithState;
              } else {
                // Add new comment
                newComments.push(commentWithState);
              }
              
              return newComments;
            });
            
            return commentWithState;
          } catch (err) {
            console.error(`Error fetching comment ${kidId}:`, err);
            return null;
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

  // Function to toggle comment expansion
  const toggleComment = useCallback((commentId: number) => {
    setComments(prevComments => 
      updateCommentInTree(
        commentId,
        comment => ({ ...comment, isExpanded: !comment.isExpanded }),
        prevComments
      )
    );
  }, [updateCommentInTree]);

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
      
      // Load each child comment individually
      for (const kidId of kidIds) {
        try {
          const childComment = await getComment(kidId);
          
          // Skip if null or deleted
          if (!childComment) continue;
          
          // Transform to add UI state
          const childWithState = {
            ...childComment,
            isExpanded: true,
            childrenLoaded: false,
            children: []
          };
          
          // Add this child to the parent's children array
          setComments(prevComments => 
            updateCommentInTree(
              commentId,
              comment => {
                const existingChildren = comment.children || [];
                const existingIndex = existingChildren.findIndex(c => c.id === childComment.id);
                
                let newChildren;
                if (existingIndex >= 0) {
                  // Update existing child
                  newChildren = [...existingChildren];
                  newChildren[existingIndex] = childWithState;
                } else {
                  // Add new child
                  newChildren = [...existingChildren, childWithState];
                }
                
                return {
                  ...comment,
                  children: newChildren
                };
              },
              prevComments
            )
          );
        } catch (err) {
          console.error(`Error loading comment ${kidId}:`, err);
        }
      }
      
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
  }, [comments, findCommentById, updateCommentInTree]);

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