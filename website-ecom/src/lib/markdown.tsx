import { Fragment, type ReactNode } from "react";
import { Link } from "react-router";

// Minimal, safe markdown: paragraphs, line breaks, **bold**, *italic*,
// `code`, [links](url), "- " / "1. " lists. Produces React nodes, never HTML.

const INLINE = /(\*\*[^*]+\*\*|__[^_]+__|\*[^*\s][^*]*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\)|https?:\/\/[^\s)]+)/g;

function safeHref(url: string): string | null {
  const u = url.trim();
  if (u.startsWith("/") && !u.startsWith("//")) return u;
  if (/^https?:\/\//i.test(u) || /^mailto:/i.test(u)) return u;
  return null;
}

function renderLink(text: string, href: string, key: string): ReactNode {
  const safe = safeHref(href);
  if (!safe) return <Fragment key={key}>{text}</Fragment>;
  if (safe.startsWith("/")) {
    return (
      <Link key={key} to={safe} className="md-link">
        {text}
      </Link>
    );
  }
  return (
    <a key={key} href={safe} target="_blank" rel="noopener noreferrer" className="md-link">
      {text}
    </a>
  );
}

function inline(text: string, keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  let i = 0;
  for (const m of text.matchAll(INLINE)) {
    const tok = m[0];
    const idx = m.index ?? 0;
    if (idx > last) out.push(text.slice(last, idx));
    const key = `${keyBase}-${i++}`;
    if (tok.startsWith("**") || tok.startsWith("__")) out.push(<strong key={key}>{tok.slice(2, -2)}</strong>);
    else if (tok.startsWith("`")) out.push(<code key={key}>{tok.slice(1, -1)}</code>);
    else if (tok.startsWith("[")) {
      const mm = tok.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
      out.push(mm ? renderLink(mm[1] as string, mm[2] as string, key) : tok);
    } else if (tok.startsWith("http")) out.push(renderLink(tok, tok, key));
    else if (tok.startsWith("*")) out.push(<em key={key}>{tok.slice(1, -1)}</em>);
    else out.push(tok);
    last = idx + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

function withBreaks(lines: string[], keyBase: string): ReactNode[] {
  const out: ReactNode[] = [];
  lines.forEach((l, i) => {
    if (i > 0) out.push(<br key={`${keyBase}-br-${i}`} />);
    out.push(...inline(l, `${keyBase}-${i}`));
  });
  return out;
}

export function Markdown({ text }: { text: string }) {
  if (!text) return null;
  const blocks = text.replace(/\r\n/g, "\n").split(/\n{2,}/);
  const nodes: ReactNode[] = [];
  blocks.forEach((block, bi) => {
    const lines = block.split("\n").filter((l) => l.trim() !== "");
    if (lines.length === 0) return;
    let buf: string[] = [];
    let list: { ordered: boolean; items: string[] } | null = null;
    const flushPara = () => {
      if (buf.length) nodes.push(<p key={`p-${bi}-${nodes.length}`}>{withBreaks(buf, `p${bi}-${nodes.length}`)}</p>);
      buf = [];
    };
    const flushList = () => {
      if (!list) return;
      const items = list.items.map((it, ii) => <li key={ii}>{inline(it, `l${bi}-${ii}`)}</li>);
      nodes.push(list.ordered ? <ol key={`ol-${bi}-${nodes.length}`}>{items}</ol> : <ul key={`ul-${bi}-${nodes.length}`}>{items}</ul>);
      list = null;
    };
    for (const line of lines) {
      const ul = line.match(/^\s*[-*•]\s+(.*)$/);
      const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
      if (ul || ol) {
        flushPara();
        const ordered = !!ol;
        if (list && list.ordered !== ordered) flushList();
        if (!list) list = { ordered, items: [] };
        list.items.push(((ul ?? ol) as RegExpMatchArray)[1] as string);
      } else {
        flushList();
        buf.push(line);
      }
    }
    flushPara();
    flushList();
  });
  return <div className="md">{nodes}</div>;
}
