const CLOUDFLARE_BEACON_SRC = "https://static.cloudflareinsights.com/beacon.min.js";
const CLOUDFLARE_BEACON_TOKEN = "83365f9a690348639aed424b260e9b63";
const CLOUDFLARE_BEACON_SCRIPT_ID = "cloudflare-beacon";

let analyticsScheduled = false;

const injectAnalyticsScript = () => {
  if (typeof document === "undefined") {
    return;
  }

  if (document.getElementById(CLOUDFLARE_BEACON_SCRIPT_ID)) {
    return;
  }

  const script = document.createElement("script");
  script.id = CLOUDFLARE_BEACON_SCRIPT_ID;
  script.defer = true;
  script.src = CLOUDFLARE_BEACON_SRC;
  script.setAttribute(
    "data-cf-beacon",
    JSON.stringify({ token: CLOUDFLARE_BEACON_TOKEN }),
  );

  document.head.appendChild(script);
};

const scheduleWhenIdle = (callback: () => void) => {
  if (typeof window === "undefined") {
    return;
  }

  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => callback(), { timeout: 5000 });
    return;
  }

  globalThis.setTimeout(callback, 3000);
};

export const scheduleAnalyticsLoad = () => {
  if (!import.meta.env.PROD || analyticsScheduled) {
    return;
  }

  analyticsScheduled = true;

  const onWindowLoad = () => {
    scheduleWhenIdle(injectAnalyticsScript);
  };

  if (document.readyState === "complete") {
    onWindowLoad();
    return;
  }

  window.addEventListener("load", onWindowLoad, { once: true });
};
