interface ProseContentProps {
  html: string;
  className?: string;
}

function decodeHtmlEntities(text: string): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = text;
  return textarea.value;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatContent(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // Decode any HTML entities first (fixes double-encoded content from the db)
  const decoded = decodeHtmlEntities(trimmed);

  // If it already contains HTML tags (from TipTap), trust it
  if (/<[a-z][\s\S]*>/i.test(decoded)) {
    return decoded;
  }

  // Plain text fallback: split on double newlines into paragraphs,
  // single newlines become <br> inside each paragraph
  const paragraphs = decoded.split(/\n\s*\n/).filter(Boolean);
  return paragraphs
    .map((p) => {
      const withBreaks = escapeHtml(p).replace(/\n/g, "<br>");
      return `<p>${withBreaks}</p>`;
    })
    .join("");
}

export default function ProseContent({ html, className = "" }: ProseContentProps) {
  if (!html || html === "<p></p>") return null;

  const formatted = formatContent(html);
  if (!formatted) return null;

  return (
    <div
      className={`prose-dark ${className}`}
      dangerouslySetInnerHTML={{ __html: formatted }}
      data-testid="prose-content"
    />
  );
}
