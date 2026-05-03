import DOMPurify from "dompurify";

const ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "b",
  "em",
  "i",
  "u",
  "s",
  "strike",
  "sub",
  "sup",
  "span",
  "blockquote",
  "ul",
  "ol",
  "li",
  "a",
];

const ALLOWED_ATTR = ["href", "title", "target", "rel"];

export const sanitizeRichHtml = (html: string): string =>
  DOMPurify.sanitize(String(html || ""), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
    FORBID_ATTR: ["style"],
  });

export const getPlainTextFromHtml = (html: string): string => {
  const container = document.createElement("div");
  container.innerHTML = sanitizeRichHtml(html);
  return (container.textContent || "").replace(/\s+/g, " ").trim();
};
