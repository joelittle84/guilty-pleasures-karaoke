interface ProseContentProps {
  html: string;
  className?: string;
}

export default function ProseContent({ html, className = "" }: ProseContentProps) {
  if (!html || html === "<p></p>") return null;
  return (
    <div
      className={`prose-dark ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
      data-testid="prose-content"
    />
  );
}
