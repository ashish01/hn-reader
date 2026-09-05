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

/*
 * Site labels — the "(domain)" shown next to a story title.
 *
 * news.ycombinator.com does not render the bare registrable domain for every
 * URL. Its site column is table-driven and deliberately *more specific* for
 * platforms where the URL encodes the author/owner of the content:
 *
 *   1. PATH-owner platforms (git forges, social feeds, newsletters): the first
 *      path segment is the account, so HN shows `host/account`:
 *          https://github.com/anthropics/fermats-last-theorem  -> github.com/anthropics
 *          https://twitter.com/OpenAI/status/…                 -> twitter.com/openai
 *          https://medium.com/@nikitonsky/…                    -> medium.com/nikitonsky
 *
 *   2. SUBDOMAIN-owner platforms: the account lives on the subdomain, so HN
 *      keeps the whole host instead of collapsing to the bare domain:
 *          https://<blog>.wordpress.com/…      -> <blog>.wordpress.com
 *          https://<name>.substack.com/…       -> <name>.substack.com
 *          https://support.google.com/…        -> support.google.com
 *
 *   3. Everything else collapses to the registrable domain (via the public
 *      suffix list), matching plain expectations:
 *          https://news.un.org/en/story/…   -> un.org
 *          https://engineering.atspotify.com/… -> atspotify.com
 *
 * The tables below encode the behavior observed on HN's live pages/items on
 * 2026-09-05 (story IDs: 49568697, 49571634, 49575859, 49565693, 49576922,
 * 49574381, 49570133, 21390563, 18440756, 49576395, …). They are intentionally
 * small and curated — HN's own list is not public and grows over time.
 */

/** Hosts where the first path segment identifies the author/owner. */
const PATH_OWNER_HOSTS = new Set([
  "github.com",
  "gitlab.com",
  "codeberg.org",
  "twitter.com",
  "medium.com", // medium.com/@user/... (the "@" is dropped, like HN does)
  "buttondown.com", // <newsletter> is the publication identity
]);

/** Hosts where the subdomain identifies the author/owner (keep the full host). */
const FULL_HOST_HOSTS = new Set([
  "github.io", // <owner>.github.io (GitHub Pages)
  "vercel.app", // <owner>.vercel.app (Vercel deployments)
  "wordpress.com", // <blog>.wordpress.com
  "substack.com", // <newsletter>.substack.com
  "google.com", // product subdomains, e.g. support.google.com
  "berkeley.edu", // e.g. greatergood.berkeley.edu
]);

/** Hosts HN collapses to the bare domain even when the suffix list marks them private. */
const COLLAPSE_TO_BASE_HOSTS = new Set(["codeberg.page"]);

const lastTwoLabels = (host: string): string => {
  const labels = host.split(".");
  return labels.slice(-2).join(".");
};

/**
 * Resolve the host part of the label the way HN does.
 */
const siteHostLabel = (host: string): string => {
  const bare = host.replace(/^www\./, "");
  const base = lastTwoLabels(bare);

  if (COLLAPSE_TO_BASE_HOSTS.has(base)) return base;
  if (FULL_HOST_HOSTS.has(base)) return bare;
  // Under the .name registry the identity lives at the third level
  // (e.g. neil.fraser.name), so HN keeps the whole host.
  if (base.endsWith(".name")) return bare;

  // Default: registrable domain via the public suffix list. This handles
  // www-, ccTLDs (abc.net.au), and private tenants (github.io, vercel.app).
  return getDomain(bare, { allowPrivateDomains: true }) || base;
};

/**
 * Format a URL the way HN renders it in the site column:
 * "(domain)" plus, for account platforms, "/owner".
 */
export const formatSiteLabel = (url: string | undefined): string => {
  if (!url) return "";

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "";
  }

  const host = parsed.hostname.toLowerCase();
  const hostLabel = siteHostLabel(host);

  const base = lastTwoLabels(host);
  if (!PATH_OWNER_HOSTS.has(base)) return hostLabel;

  // Only append when the URL is deep enough that the first segment is an
  // owner (github.com/<owner>/<repo>, twitter.com/<user>/status/...).
  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length < 2) return hostLabel;

  const owner = segments[0].replace(/^@/, "").toLowerCase(); // @user -> user; Xbow -> xbow
  if (!owner) return hostLabel;
  return `${hostLabel}/${owner}`;
};

/**
 * Backwards-compatible alias.
 */
export const formatUrl = formatSiteLabel;
