import { getDomain } from "tldts";

/**
 * Format a timestamp as a relative time string
 */
export const formatTime = (time: number | undefined): string => {
  if (!time) return "";

  const nowSeconds = Math.floor(Date.now() / 1000);
  const diffSeconds = nowSeconds - time;
  const clampedDiff = Math.max(diffSeconds, 0);
  const minutes = Math.floor(clampedDiff / 60);
  const hours = Math.floor(clampedDiff / 3600);
  const days = Math.floor(clampedDiff / 86400);

  if (days > 0) return `${days} day${days > 1 ? "s" : ""} ago`;
  if (hours > 0) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  if (minutes <= 0) return "just now";
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
