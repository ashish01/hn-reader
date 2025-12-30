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
    fetchStoryWithComments(storyId);
  }, [fetchStoryWithComments, storyId]);

  return {
    story,
    comments,
    loading,
    loadingComments,
    error,
    toggleComment,
    loadCommentChildren,
  };
};

export default useStoryWithComments;
