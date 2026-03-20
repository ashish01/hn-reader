import axios from "axios";
import { Item, Story, Comment } from "../types";
import { pLimit } from "../utils/pLimit";

const BASE_URL = "https://hacker-news.firebaseio.com/v0";

const requestJson = async <T>(
  path: string,
  signal?: AbortSignal,
): Promise<T> => {
  try {
    const response = await axios.get<T>(`${BASE_URL}${path}`, { signal });
    return response.data;
  } catch (error) {
    // Keep cancellation behavior compatible with existing store checks.
    if (axios.isCancel(error)) {
      throw new DOMException("The operation was aborted.", "AbortError");
    }
    throw error;
  }
};

/**
 * Generic item fetcher — single function for story, comment, or any item.
 */
export const fetchItem = async <T extends Item = Item>(
  id: number,
  signal?: AbortSignal,
): Promise<T> => {
  return requestJson<T>(`/item/${id}.json`, signal);
};

export const getStory = async (
  id: number,
  signal?: AbortSignal,
): Promise<Story> => {
  return fetchItem<Story>(id, signal);
};

export const getComment = async (
  id: number,
  signal?: AbortSignal,
): Promise<Comment> => {
  return fetchItem<Comment>(id, signal);
};

export const getTopStories = async (
  limit: number = 30,
  signal?: AbortSignal,
): Promise<number[]> => {
  const ids = await requestJson<number[]>("/topstories.json", signal);
  return ids.slice(0, limit);
};

/**
 * Fetch multiple items in parallel (capped at 15 concurrent requests).
 * Filters out null/deleted/dead items.
 */
export const getItemsBatch = async (
  ids: number[],
  signal?: AbortSignal,
): Promise<Item[]> => {
  const limit = pLimit(15);

  const items = await Promise.all(
    ids.map((id) =>
      limit(async () => {
        try {
          const item = await fetchItem(id, signal);
          if (item && !item.deleted && !item.dead) {
            return item;
          }
          return null;
        } catch (error) {
          if (error instanceof DOMException && error.name === "AbortError") {
            throw error;
          }
          console.error(`Error fetching item ${id}:`, error);
          return null;
        }
      }),
    ),
  );

  return items.filter((item): item is Item => item !== null);
};

/**
 * Get the current max item ID.
 */
export const getMaxItemId = async (signal?: AbortSignal): Promise<number> => {
  return requestJson<number>("/maxitem.json", signal);
};
