"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { cn } from "@/lib/utils";

interface ChatMarkdownProps {
  content: string;
  className?: string;
}

/**
 * Renders a chat message as a safe subset of markdown.
 *
 * Allowed:
 *   **bold**, *italic*, ~~strikethrough~~, `inline code`, fenced code blocks,
 *   unordered / ordered lists, blockquotes, autolinks, soft line breaks.
 *
 * Disallowed (rendered as plain text via `unwrapDisallowed`):
 *   headers (would hijack the chat's visual hierarchy),
 *   images (no embedded media in chat — attachments come later as a
 *   separate feature with a proper upload pipeline),
 *   tables (overkill for chat, and can blow up narrow layouts),
 *   raw HTML (XSS surface; react-markdown ignores HTML by default,
 *   we don't enable `rehype-raw`).
 *
 * All links open in a new tab with `rel="noopener noreferrer nofollow"`:
 *   - noopener / noreferrer protect against window.opener tab-nabbing
 *   - nofollow prevents student-submitted URLs from passing SEO juice,
 *     which matters if the chat is ever indexed or mirrored.
 *
 * The `p` element uses `inline` display so that trailing sibling content
 * in the parent (like the "(edited)" marker) can flow on the same line
 * for single-paragraph messages. Multi-paragraph messages use the
 * `[&+p]:block` selector to restore block layout from the second paragraph
 * onward.
 */
export function ChatMarkdown({ content, className }: ChatMarkdownProps) {
  return (
    <div className={cn("break-words", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        disallowedElements={[
          "h1",
          "h2",
          "h3",
          "h4",
          "h5",
          "h6",
          "img",
          "table",
          "thead",
          "tbody",
          "tr",
          "td",
          "th",
          "input",
        ]}
        unwrapDisallowed
        components={{
          a: ({ children, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="text-green-600 dark:text-green-400 underline underline-offset-2 decoration-green-500/40 hover:decoration-green-500 transition-colors"
            >
              {children}
            </a>
          ),
          code: ({ className: codeClass, children, ...props }) => {
            // react-markdown v9 distinguishes inline vs block code by the
            // presence of a `language-*` class on the element.
            const isBlock = /language-/.test(codeClass || "");
            if (isBlock) {
              return (
                <code
                  className={cn(codeClass, "text-[0.85em]")}
                  {...props}
                >
                  {children}
                </code>
              );
            }
            return (
              <code
                className="rounded bg-neutral-100 dark:bg-neutral-800 px-1 py-0.5 text-[0.85em] font-mono text-neutral-800 dark:text-neutral-200"
                {...props}
              >
                {children}
              </code>
            );
          },
          pre: ({ children, ...props }) => (
            <pre
              {...props}
              className="my-1.5 overflow-x-auto rounded-md bg-neutral-100 dark:bg-neutral-800 p-2.5 text-xs leading-relaxed"
            >
              {children}
            </pre>
          ),
          ul: ({ children, ...props }) => (
            <ul {...props} className="list-disc pl-5 my-1 space-y-0.5">
              {children}
            </ul>
          ),
          ol: ({ children, ...props }) => (
            <ol {...props} className="list-decimal pl-5 my-1 space-y-0.5">
              {children}
            </ol>
          ),
          li: ({ children, ...props }) => (
            <li {...props} className="pl-0.5">
              {children}
            </li>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              {...props}
              className="my-1 border-l-2 border-neutral-300 dark:border-neutral-600 pl-2.5 italic text-neutral-500 dark:text-neutral-400"
            >
              {children}
            </blockquote>
          ),
          p: ({ children, ...props }) => (
            // Inline by default so the "(edited)" marker after the markdown
            // block stays on the same line for single-paragraph messages.
            // Subsequent paragraphs (the +p selector) restore block layout
            // with top margin.
            <p
              {...props}
              className="inline [&+p]:block [&+p]:mt-2 [&+pre]:mt-2 [&+ul]:mt-1 [&+ol]:mt-1 [&+blockquote]:mt-1"
            >
              {children}
            </p>
          ),
          strong: ({ children, ...props }) => (
            <strong
              {...props}
              className="font-semibold text-neutral-900 dark:text-neutral-100"
            >
              {children}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em {...props} className="italic">
              {children}
            </em>
          ),
          del: ({ children, ...props }) => (
            <del
              {...props}
              className="text-neutral-400 dark:text-neutral-500"
            >
              {children}
            </del>
          ),
          hr: () => (
            <hr className="my-2 border-neutral-200 dark:border-neutral-700" />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
