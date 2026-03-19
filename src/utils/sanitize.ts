import DOMPurify from "dompurify";

/**
 * Sanitize HTML string to prevent XSS attacks.
 * Allows safe subset of HTML tags used by HN API.
 */
export const sanitizeHtml = (html: string): string => {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "a",
      "b",
      "blockquote",
      "br",
      "code",
      "em",
      "i",
      "li",
      "ol",
      "p",
      "pre",
      "strong",
      "ul",
    ],
    ALLOWED_ATTR: ["href", "rel", "target"],
  });
};
