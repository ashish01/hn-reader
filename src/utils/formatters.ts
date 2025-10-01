import { getDomain } from "tldts";

/**
 * Format a timestamp as a relative time string
 */
export const formatTime = (time: number | undefined): string => {
  if (!time) return "";

  const date = new Date(time * 1000);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
};

/**
 * Format a URL to display just the domain
 */
export const formatUrl = (url: string | undefined): string => {
  if (!url) return "";

  try {
    const domain = getDomain(url, { allowPrivateDomains: true });
    return domain || "";
  } catch {
    return "";
  }
};
