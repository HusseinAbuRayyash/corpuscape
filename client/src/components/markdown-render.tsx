import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRenderProps {
  content: string;
  className?: string;
}

export function MarkdownRender({ content, className = "" }: MarkdownRenderProps) {
  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none ${className}`} data-testid="text-markdown-content">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}
