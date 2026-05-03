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

const sanitizeRichHtml = (html: string): string =>
  DOMPurify.sanitize(String(html || ""), {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ["script", "style", "iframe", "object", "embed"],
    FORBID_ATTR: ["style"],
  });

export const toSafeNoticeHtml = (content: string): string => {
  const raw = String(content || "");
  const hasHtmlTag = /<[^>]+>/.test(raw);
  if (!hasHtmlTag) {
    return DOMPurify.sanitize(raw).replace(/\n/g, "<br />");
  }
  return sanitizeRichHtml(raw);
};
