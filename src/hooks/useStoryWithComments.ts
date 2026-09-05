import { useEffect } from "react";
import useStoryWithCommentsStore from "../store/useStoryWithCommentsStore";

export const useStoryWithComments = (storyId: number) => {
  const story = useStoryWithCommentsStore((state) => state.story);
  const comments = useStoryWithCommentsStore((state) => state.comments);
  const loading = useStoryWithCommentsStore((state) => state.loading);
  const loadingComments = useStoryWithCommentsStore(
    (state) => state.loadingComments,
  );
  const error = useStoryWithCommentsStore((state) => state.error);
  const commentsError = useStoryWithCommentsStore((state) => state.commentsError);
  const retryComments = useStoryWithCommentsStore((state) => state.retryComments);
  const cancel = useStoryWithCommentsStore((state) => state.cancel);
  const fetchStoryWithComments = useStoryWithCommentsStore(
    (state) => state.fetchStoryWithComments,
  );
  const toggleComment = useStoryWithCommentsStore(
    (state) => state.toggleComment,
  );
  const loadCommentChildren = useStoryWithCommentsStore(
    (state) => state.loadCommentChildren,
  );

  useEffect(() => {
    // Store internally manages its own AbortController:
    // calling fetchStoryWithComments aborts any previous in-flight request.
    fetchStoryWithComments(storyId);
    return cancel;
  }, [fetchStoryWithComments, storyId, cancel]);

  return {
    story,
    comments,
    loading,
    loadingComments,
    error,
    commentsError,
    retryComments,
    toggleComment,
    loadCommentChildren,
  };
};

export default useStoryWithComments;
