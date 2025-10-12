import axios from 'axios';
import { Item, Story, Comment, User } from '../types';

const BASE_URL = 'https://hacker-news.firebaseio.com/v0';

export const getItem = async (id: number): Promise<Item> => {
  const response = await axios.get<Item>(`${BASE_URL}/item/${id}.json`);
  return response.data;
};

export const getStory = async (id: number): Promise<Story> => {
  const response = await axios.get<Story>(`${BASE_URL}/item/${id}.json`);
  return response.data;
};

export const getComment = async (id: number): Promise<Comment> => {
  const response = await axios.get<Comment>(`${BASE_URL}/item/${id}.json`);
  return response.data;
};

export const getUser = async (id: string): Promise<User> => {
  const response = await axios.get<User>(`${BASE_URL}/user/${id}.json`);
  return response.data;
};

export const getTopStories = async (limit: number = 30): Promise<number[]> => {
  const response = await axios.get<number[]>(`${BASE_URL}/topstories.json`);
  return response.data.slice(0, limit);
};

export const getNewStories = async (limit: number = 30): Promise<number[]> => {
  const response = await axios.get<number[]>(`${BASE_URL}/newstories.json`);
  return response.data.slice(0, limit);
};

export const getBestStories = async (limit: number = 30): Promise<number[]> => {
  const response = await axios.get<number[]>(`${BASE_URL}/beststories.json`);
  return response.data.slice(0, limit);
};

// Fetch a story with its comments (one level)
export const getStoryWithComments = async (id: number): Promise<{ story: Story, comments: Comment[] }> => {
  const story = await getStory(id);
  
  if (!story.kids || story.kids.length === 0) {
    return { story, comments: [] };
  }
  
  const comments = await Promise.all(
    story.kids.map(kidId => getComment(kidId))
  );
  
  return { story, comments };
};

// Prefetch next level comments for a given comment
export const getCommentChildren = async (commentId: number): Promise<Comment[]> => {
  const comment = await getComment(commentId);

  if (!comment.kids || comment.kids.length === 0) {
    return [];
  }

  return Promise.all(
    comment.kids.map(kidId => getComment(kidId))
  );
};

// Fetch multiple items in parallel and filter out null/deleted items
export const getItemsBatch = async (ids: number[]): Promise<Item[]> => {
  const items = await Promise.all(
    ids.map(async (id) => {
      try {
        const item = await getItem(id);
        // Filter out deleted or dead items
        if (item && !item.deleted && !item.dead) {
          return item;
        }
        return null;
      } catch (error) {
        console.error(`Error fetching item ${id}:`, error);
        return null;
      }
    })
  );

  // Filter out null values
  return items.filter((item): item is Item => item !== null);
};

// Get max item ID
export const getMaxItemId = async (): Promise<number> => {
  const response = await axios.get<number>(`${BASE_URL}/maxitem.json`);
  return response.data;
};