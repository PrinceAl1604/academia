"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import { cn } from "@/lib/utils";

interface ChatMarkdownProps {
  content: string;
  className?: string;
  /**
   * Known mentionable display names. When provided, `@Name` tokens that
   * match an entry are rendered as styled pills. Names not in this list
   * stay as plain text — we deliberately avoid pill'ing every `@`-prefixed
   * word because messages can contain literal at-signs (e.g. `@deprecated`
   * in a code discussion) that aren't real user mentions.
   */
  mentionableNames?: string[];
  /**
   * Name of the current viewer. When a mention's name matches, the pill
   * gets a stronger treatment (ring + darker background) so the user can
   * scan for pings at a glance.
   */
  currentUserName?: string;
}

/** Escape regex metacharacters in a display-name literal. */
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Replace `@Name` tokens in a plain string with styled <span> pills.
 * Returns the input unchanged when no matches are found (keeps the common
 * no-mention path allocation-free).
 *
 * Names are sorted descending by length before being joined into the
 * regex alternation so `"@Alex Landrin"` wins over `"@Alex"` — regex
 * alternation is left-to-right greedy, so the longer option must come
 * first to match maximally.
 */
function renderWithMentions(
  text: string,
  names: string[] | undefined,
  currentName: string | undefined
): React.ReactNode {
  if (!text || !names?.length) return text;

  const sorted = [...names].sort((a, b) => b.length - a.length);
  const escaped = sorted.map(escapeRegex);
  const re = new RegExp(
    `(^|\\s)@(${escaped.join("|")})(?=\\s|$|[.,!?;:)])`,
    "g"
  );

  const parts: React.ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;

  while ((m = re.exec(text)) !== null) {
    const leadLen = m[1].length;
    const name = m[2];
    const atIdx = m.index + leadLen;

    if (atIdx > lastIdx) parts.push(text.slice(lastIdx, atIdx));

    const mine = !!currentName && name === currentName;
    parts.push(
      <span
        key={`m-${atIdx}`}
        data-mention={name}
        className={cn(
          "rounded px-1 py-0.5 text-xs font-medium whitespace-nowrap",
          mine
            ? "bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 ring-1 ring-green-400 dark:ring-green-700"
            : "bg-green-50/80 dark:bg-green-900/20 text-green-700 dark:text-green-400"
        )}
      >
        @{name}
      </span>
    );

    lastIdx = atIdx + 1 + name.length;
  }

  if (lastIdx === 0) return text; // no hits — cheap path
  if (lastIdx < text.length) parts.push(text.slice(lastIdx));
  return parts;
}

/**
 * Swap string children for mention-aware nodes. Non-string children
 * (e.g. nested <strong>/<em>/<code>) pass through unchanged — they're
 * handled by their own component override, so nested markdown like
 * `**hey @alex**` still pills the mention inside bold text.
 */
function processChildren(
  children: React.ReactNode,
  names: string[] | undefined,
  currentName: string | undefined
): React.ReactNode {
  const step = (c: React.ReactNode, i: number) => {
    if (typeof c === "string") {
      return (
        <React.Fragment key={`t-${i}`}>
          {renderWithMentions(c, names, currentName)}
        </React.Fragment>
      );
    }
    return c;
  };
  if (Array.isArray(children)) return children.map(step);
  return step(children, 0);
}

/**
 * Renders a chat message as a safe subset of markdown, with optional
 * @-mention pills. Each text-level component override runs children
 * through `processChildren` so pills appear inside paragraphs, lists,
 * emphasis, and blockquotes — but NOT inside `code`/`pre`, so literal
 * `` `@alex` `` snippets stay as code.
 *
 * Allowed:
 *   **bold**, *italic*, ~~strikethrough~~, `inline code`, fenced code blocks,
 *   unordered / ordered lists, blockquotes, autolinks, soft line breaks,
 *   @-mention pills (when `mentionableNames` is supplied).
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
export function ChatMarkdown({
  content,
  className,
  mentionableNames,
  currentUserName,
}: ChatMarkdownProps) {
  // Pre-bind the processor so each component override gets the same args
  // without re-closing over them. Keeps the JSX below readable.
  const mentions = (children: React.ReactNode) =>
    processChildren(children, mentionableNames, currentUserName);

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
              {mentions(children)}
            </a>
          ),
          code: ({ className: codeClass, children, ...props }) => {
            // react-markdown v9 distinguishes inline vs block code by the
            // presence of a `language-*` class on the element. Code blocks
            // intentionally SKIP mention processing so `` `@alex` `` stays
            // as literal code — this is the whole point of backticks.
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
              {mentions(children)}
            </li>
          ),
          blockquote: ({ children, ...props }) => (
            <blockquote
              {...props}
              className="my-1 border-l-2 border-neutral-300 dark:border-neutral-600 pl-2.5 italic text-neutral-500 dark:text-neutral-400"
            >
              {mentions(children)}
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
              {mentions(children)}
            </p>
          ),
          strong: ({ children, ...props }) => (
            <strong
              {...props}
              className="font-semibold text-neutral-900 dark:text-neutral-100"
            >
              {mentions(children)}
            </strong>
          ),
          em: ({ children, ...props }) => (
            <em {...props} className="italic">
              {mentions(children)}
            </em>
          ),
          del: ({ children, ...props }) => (
            <del
              {...props}
              className="text-neutral-400 dark:text-neutral-500"
            >
              {mentions(children)}
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
