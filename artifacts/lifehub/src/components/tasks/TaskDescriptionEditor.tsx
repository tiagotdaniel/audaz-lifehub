import { useState, useRef, useEffect, Fragment } from "react";
import { useAuth } from "@clerk/react";
import { useGetSectors, useGetProjects, useGetTasks } from "@workspace/api-client-react";
import {
  Heading1, Heading2, List as ListIcon, CheckSquare, ChevronRight as ToggleIcon,
  Table as TableIcon, Paperclip, Minus, Quote,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (value: string) => void;
  editable: boolean;
  placeholder?: string;
}

interface Ref { id: string; label: string; }

const BLOCKS: { key: string; label: string; icon: typeof Heading1; insert: string }[] = [
  { key: "heading1", label: "Título 1", icon: Heading1, insert: "\n# " },
  { key: "heading2", label: "Título 2", icon: Heading2, insert: "\n## " },
  { key: "list", label: "Lista", icon: ListIcon, insert: "\n- " },
  { key: "checklist", label: "Checklist", icon: CheckSquare, insert: "\n[ ] " },
  { key: "toggle", label: "Toggle", icon: ToggleIcon, insert: "\n▸ Toggle: " },
  { key: "table", label: "Tabela", icon: TableIcon, insert: "\n| Coluna 1 | Coluna 2 |\n| valor 1 | valor 2 |\n" },
  { key: "attachment", label: "Anexo", icon: Paperclip, insert: "\n📎 Nome do anexo :: https://" },
  { key: "divider", label: "Divisor", icon: Minus, insert: "\n---\n" },
  { key: "quote", label: "Citação", icon: Quote, insert: "\n> " },
];

const MENTION_CONFIG: Record<string, { level: number; label: string }[]> = {
  "@": [{ level: 1, label: "pessoa" }, { level: 2, label: "tarefa" }, { level: 3, label: "lista" }],
  "#": [{ level: 1, label: "setor" }, { level: 2, label: "lista" }, { level: 3, label: "projeto" }],
};

const MENTION_TOKEN_RE = /(@{1,3}|#{1,3})\[([^\]]+)\]\(([^)]+)\)/g;

function useAuthedFetch() {
  const { getToken } = useAuth();
  return async (path: string) => {
    const token = await getToken();
    const res = await fetch(path, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) return [];
    return res.json();
  };
}

function getCaretCoordinates(el: HTMLTextAreaElement) {
  const mirror = document.createElement("div");
  const style = window.getComputedStyle(el);
  const props = [
    "boxSizing", "width", "paddingTop", "paddingRight", "paddingBottom", "paddingLeft",
    "borderTopWidth", "borderRightWidth", "borderBottomWidth", "borderLeftWidth",
    "fontFamily", "fontSize", "fontWeight", "lineHeight", "letterSpacing", "whiteSpace", "wordWrap",
  ] as const;
  props.forEach((p) => { (mirror.style as any)[p] = style[p as any]; });
  mirror.style.position = "absolute";
  mirror.style.visibility = "hidden";
  mirror.style.whiteSpace = "pre-wrap";
  mirror.style.wordWrap = "break-word";
  mirror.style.top = "0";
  mirror.style.left = "-9999px";

  const before = el.value.slice(0, el.selectionStart ?? 0);
  mirror.textContent = before;
  const marker = document.createElement("span");
  marker.textContent = "​";
  mirror.appendChild(marker);
  document.body.appendChild(mirror);
  const markerRect = marker.getBoundingClientRect();
  const mirrorRect = mirror.getBoundingClientRect();
  const top = markerRect.top - mirrorRect.top - el.scrollTop;
  const left = markerRect.left - mirrorRect.left - el.scrollLeft;
  document.body.removeChild(mirror);
  return { top, left, lineHeight: parseFloat(style.lineHeight) || 20 };
}

function renderInline(text: string, keyPrefix: string) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(MENTION_TOKEN_RE);
  let i = 0;
  while ((match = re.exec(text))) {
    if (match.index > lastIndex) parts.push(<Fragment key={`${keyPrefix}-t${i++}`}>{text.slice(lastIndex, match.index)}</Fragment>);
    const [, marker, label] = match;
    parts.push(
      <span key={`${keyPrefix}-m${i++}`} className="inline-flex items-center px-1.5 py-0.5 rounded bg-[#C9A84C]/15 text-[#C9A84C] font-medium text-[0.9em]">
        {marker}{label}
      </span>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(<Fragment key={`${keyPrefix}-tend`}>{text.slice(lastIndex)}</Fragment>);
  return parts.length ? parts : text;
}

export default function TaskDescriptionEditor({ value, onChange, editable, placeholder }: Props) {
  const [showSlash, setShowSlash] = useState(false);
  const [showMention, setShowMention] = useState(false);
  const [mentionMarker, setMentionMarker] = useState<"@" | "#">("@");
  const [mentionLevel, setMentionLevel] = useState(1);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState(-1);
  const [menuStyle, setMenuStyle] = useState<React.CSSProperties>({});
  const [members, setMembers] = useState<Ref[]>([]);
  const [lists, setLists] = useState<Ref[]>([]);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const authedFetch = useAuthedFetch();

  const { data: sectors } = useGetSectors();
  const { data: projects } = useGetProjects();
  const { data: tasksData } = useGetTasks();

  useEffect(() => {
    authedFetch("/api/members").then((d) => setMembers(Array.isArray(d) ? d.map((m: any) => ({ id: m.id, label: m.email })) : []));
    authedFetch("/api/lists").then((d) => setLists(Array.isArray(d) ? d.map((l: any) => ({ id: l.id, label: l.name })) : []));
  }, []);

  useEffect(() => {
    if (!(showSlash || showMention) || !menuRef.current) return;
    const menu = menuRef.current;
    const rect = menu.getBoundingClientRect();
    const style: React.CSSProperties = { ...menuStyle };
    if (rect.right > window.innerWidth) style.left = Math.max(8, (menuStyle.left as number) - (rect.right - window.innerWidth) - 8);
    if (rect.bottom > window.innerHeight) style.top = (menuStyle.top as number) - rect.height - 28;
    setMenuStyle(style);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSlash, showMention]);

  const referenceOptions = (): Ref[] => {
    if (mentionMarker === "@") {
      if (mentionLevel === 1) return members;
      if (mentionLevel === 2) return (tasksData ?? []).map((t) => ({ id: t.id, label: t.title }));
      return lists;
    }
    if (mentionLevel === 1) return (sectors ?? []).map((s) => ({ id: s.id, label: s.label }));
    if (mentionLevel === 2) return lists;
    return (projects ?? []).map((p) => ({ id: p.id, label: p.name }));
  };

  const filteredOptions = referenceOptions().filter((o) => !mentionQuery || o.label.toLowerCase().includes(mentionQuery));

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    if (val[val.length - 1] === "/") {
      const { top, left, lineHeight } = getCaretCoordinates(e.target);
      setMenuStyle({ position: "absolute", top: top + lineHeight, left });
      setShowSlash(true);
      setShowMention(false);
      return;
    }
    setShowSlash(false);

    for (const marker of ["@", "#"] as const) {
      const m = val.match(new RegExp(`(\\${marker}{1,3})(\\w*)$`));
      if (m) {
        const triggerIndex = val.length - m[0].length;
        const { top, left, lineHeight } = getCaretCoordinates(e.target);
        setMenuStyle({ position: "absolute", top: top + lineHeight, left });
        setMentionMarker(marker);
        setMentionLevel(m[1]!.length);
        setMentionQuery(m[2]!.toLowerCase());
        setMentionTriggerIndex(triggerIndex);
        setShowMention(true);
        return;
      }
    }
    setShowMention(false);
  };

  const insertBlock = (insert: string) => {
    const slash = value.lastIndexOf("/");
    onChange(value.slice(0, slash) + insert);
    setShowSlash(false);
    setTimeout(() => textRef.current?.focus(), 50);
  };

  const insertMention = (ref: Ref) => {
    const marker = mentionMarker.repeat(mentionLevel);
    const token = `${marker}[${ref.label}](${ref.id})`;
    onChange(value.slice(0, mentionTriggerIndex) + token + " ");
    setShowMention(false);
    setTimeout(() => textRef.current?.focus(), 50);
  };

  const toggleChecklistLine = (lineIdx: number) => {
    const lines = value.split("\n");
    const line = lines[lineIdx]!;
    if (line.startsWith("[ ] ")) lines[lineIdx] = "[x] " + line.slice(4);
    else if (line.startsWith("[x] ")) lines[lineIdx] = "[ ] " + line.slice(4);
    onChange(lines.join("\n"));
  };

  const renderPreview = () => {
    const lines = value.split("\n");
    const nodes: React.ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i]!;
      if (line.startsWith("|")) {
        const tableLines: string[] = [];
        const start = i;
        while (i < lines.length && lines[i]!.startsWith("|")) { tableLines.push(lines[i]!); i++; }
        const rows = tableLines.map((l) => l.split("|").map((c) => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1));
        nodes.push(
          <table key={`t${start}`} className="w-full text-sm border-collapse my-2">
            <tbody>
              {rows.map((cells, ri) => (
                <tr key={ri} className={ri === 0 ? "font-bold text-[#C9A84C]" : "text-[var(--text-primary)]"}>
                  {cells.map((cell, ci) => <td key={ci} className="border border-[var(--surface-1)] px-2 py-1">{cell}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        );
        continue;
      }
      if (line.startsWith("# ")) nodes.push(<h1 key={i} className="text-xl font-serif font-bold text-[var(--text-primary)] mt-3 mb-1">{renderInline(line.slice(2), `h1${i}`)}</h1>);
      else if (line.startsWith("## ")) nodes.push(<h2 key={i} className="text-lg font-serif font-bold text-[var(--text-primary)] mt-2 mb-1">{renderInline(line.slice(3), `h2${i}`)}</h2>);
      else if (line.startsWith("- ")) nodes.push(<li key={i} className="text-[var(--text-primary)] text-sm ml-4 list-disc">{renderInline(line.slice(2), `l${i}`)}</li>);
      else if (line.startsWith("[ ] ") || line.startsWith("[x] ")) {
        const checked = line.startsWith("[x] ");
        nodes.push(
          <button
            key={i}
            type="button"
            onClick={() => toggleChecklistLine(i)}
            className="flex items-center gap-2 w-full text-left"
          >
            <span className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${checked ? "bg-[#38A169] border-[#38A169] text-white text-[10px]" : "border-[var(--text-subtle)]"}`}>
              {checked ? "✓" : ""}
            </span>
            <span className={`text-sm ${checked ? "text-[var(--text-muted)] line-through" : "text-[var(--text-primary)]"}`}>{renderInline(line.slice(4), `c${i}`)}</span>
          </button>
        );
      }
      else if (line === "---") nodes.push(<hr key={i} className="border-[var(--surface-1)] my-3" />);
      else if (line.startsWith("> ")) nodes.push(<blockquote key={i} className="border-l-4 border-[#C9A84C] pl-3 text-[var(--text-muted)] italic text-sm my-1">{renderInline(line.slice(2), `q${i}`)}</blockquote>);
      else if (line.startsWith("▸ Toggle: ")) nodes.push(
        <details key={i} className="text-sm text-[var(--text-primary)] my-1">
          <summary className="cursor-pointer text-[#C9A84C] font-medium">{line.slice(10) || "Toggle"}</summary>
        </details>
      );
      else if (line.startsWith("📎 ")) {
        const [name, url] = line.slice(2).split("::").map((s) => s.trim());
        nodes.push(
          <a key={i} href={url || "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-[#C9A84C] hover:underline my-1">
            📎 {name || url}
          </a>
        );
      }
      else nodes.push(<p key={i} className="text-[var(--text-primary)] text-sm">{line ? renderInline(line, `p${i}`) : <br />}</p>);
      i++;
    }
    return nodes;
  };

  if (!editable) {
    return <div className="space-y-0.5">{value ? renderPreview() : <p className="text-sm text-[var(--text-subtle)]">Sem descrição.</p>}</div>;
  }

  return (
    <div className="relative">
      <textarea
        ref={textRef}
        value={value}
        onChange={handleChange}
        placeholder={placeholder ?? 'Escreva... use "/" para blocos, "@" para marcar pessoa/tarefa/lista, "#" para setor/lista/projeto'}
        className="w-full min-h-[140px] bg-[var(--surface-2)] border border-[var(--surface-2)] rounded-lg p-3 text-[var(--text-primary)] text-sm resize-y focus:outline-none focus:border-[#C9A84C]/50 placeholder:text-[var(--text-subtle)]"
      />

      {showSlash && (
        <div ref={menuRef} style={menuStyle} className="z-30 bg-[var(--surface-0)] border border-[var(--surface-2)] rounded-lg shadow-xl p-2 grid grid-cols-3 gap-1.5 w-56">
          {BLOCKS.map((b) => (
            <button
              key={b.key}
              onClick={() => insertBlock(b.insert)}
              className="flex flex-col items-center gap-1 p-2 rounded-lg border border-[var(--surface-2)] hover:border-[#C9A84C]/50 hover:bg-[var(--surface-2)] transition-colors"
              title={b.label}
            >
              <b.icon className="h-4 w-4 text-[#C9A84C]" />
              <span className="text-[10px] text-[var(--text-muted)] text-center leading-tight">{b.label}</span>
            </button>
          ))}
        </div>
      )}

      {showMention && (
        <div ref={menuRef} style={menuStyle} className="z-30 bg-[var(--surface-0)] border border-[var(--surface-2)] rounded-lg shadow-xl overflow-hidden min-w-[200px] max-h-56 overflow-y-auto">
          <div className="px-3 py-1.5 text-[10px] uppercase tracking-widest text-[var(--text-subtle)] border-b border-[var(--surface-2)]">
            {MENTION_CONFIG[mentionMarker]?.find((c) => c.level === mentionLevel)?.label ?? ""}
          </div>
          {filteredOptions.length === 0 ? (
            <p className="px-3 py-2 text-xs text-[var(--text-subtle)]">Nada encontrado.</p>
          ) : (
            filteredOptions.slice(0, 20).map((o) => (
              <button
                key={o.id}
                onMouseDown={(e) => { e.preventDefault(); insertMention(o); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors text-left truncate"
              >
                {o.label}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
