import ReactMarkdown, { type Components } from 'react-markdown';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

const isSafeHref = (href?: string): boolean => {
  if (!href) return false;
  const normalized = href.trim().toLowerCase();
  return !normalized.startsWith('javascript:') && !normalized.startsWith('data:');
};

const SafeLink: Components['a'] = ({ href, children, ...props }) => {
  const safeHref = isSafeHref(href) ? href : undefined;
  return (
    <a
      href={safeHref}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary underline hover:no-underline"
      {...props}
    >
      {children}
    </a>
  );
};

const sanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    a: ['href', 'title', 'target', 'rel'],
  },
};

interface SafeMarkdownProps {
  content: string;
  className?: string;
}

export function SafeMarkdown({ content, className }: SafeMarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        rehypePlugins={[[rehypeSanitize, sanitizeSchema]]}
        components={{
          a: SafeLink,
          // Do not render raw HTML nodes
          html: () => null,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
