import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";
import { Plus, Trash2, FileText, ChevronRight, ArrowLeft, Download, FileDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Doc { id: string; title: string; content: string; parentId?: string; icon?: string; updatedAt: string; }

const ICONS = ["📄", "📝", "📋", "🗒️", "📓", "📖", "💡", "⭐", "🎯", "🔥"];

export default function Documentos() {
  const { getToken } = useAuth();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeDoc, setActiveDoc] = useState<Doc | null>(null);
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [showSlash, setShowSlash] = useState(false);
  const [slashPos, setSlashPos] = useState({ x: 0, y: 0 });
  const [previewMode, setPreviewMode] = useState(false);
  const [slashMenuStyle, setSlashMenuStyle] = useState<React.CSSProperties>({});
  const textRef = useRef<HTMLTextAreaElement>(null);
  const slashMenuRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<NodeJS.Timeout | undefined>(undefined);

  const authFetch = async (path: string, opts?: RequestInit) => {
    const token = await getToken();
    const res = await fetch(path, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, ...opts });
    return res.json();
  };

  const load = async () => {
    const data = await authFetch("/api/documents");
    setDocs(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Clamp the slash menu so it always stays fully inside the viewport,
  // flipping above the caret or shifting left if it would overflow.
  useEffect(() => {
    if (!showSlash || !slashMenuRef.current) return;
    const menu = slashMenuRef.current;
    const rect = menu.getBoundingClientRect();
    const style: React.CSSProperties = { top: slashPos.y, left: slashPos.x };
    if (rect.right > window.innerWidth) {
      style.left = Math.max(8, slashPos.x - (rect.right - window.innerWidth) - 8);
    }
    if (rect.bottom > window.innerHeight) {
      style.top = slashPos.y - rect.height - 28; // flip above the caret
    }
    setSlashMenuStyle(style);
  }, [showSlash, slashPos]);

  const openDoc = (doc: Doc) => {
    setActiveDoc(doc);
    setContent(doc.content);
    setTitle(doc.title);
  };

  const createDoc = async (parentId?: string) => {
    const data = await authFetch("/api/documents", { method: "POST", body: JSON.stringify({ title: "Sem título", content: "", parentId }) });
    setDocs(prev => [data, ...prev]);
    openDoc(data);
  };

  const deleteDoc = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await authFetch(`/api/documents/${id}`, { method: "DELETE" });
    setDocs(prev => prev.filter(d => d.id !== id));
    if (activeDoc?.id === id) setActiveDoc(null);
  };

  const autoSave = (newTitle: string, newContent: string) => {
    if (!activeDoc) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      setSaving(true);
      await authFetch(`/api/documents/${activeDoc.id}`, { method: "PATCH", body: JSON.stringify({ title: newTitle, content: newContent }) });
      setDocs(prev => prev.map(d => d.id === activeDoc.id ? { ...d, title: newTitle, content: newContent } : d));
      setSaving(false);
    }, 800);
  };

  // Mirrors the textarea's text up to the caret in a hidden, identically-styled
  // div so we can measure exactly where the caret sits on screen.
  const getCaretCoordinates = (el: HTMLTextAreaElement) => {
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
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    autoSave(title, val);
    const lastChar = val[val.length - 1];
    if (lastChar === "/") {
      const { top, left, lineHeight } = getCaretCoordinates(e.target);
      const pos = { x: left, y: top + lineHeight };
      setSlashPos(pos);
      setSlashMenuStyle({ position: "absolute", top: pos.y, left: pos.x });
      setShowSlash(true);
    } else {
      setShowSlash(false);
    }
  };

  const insertBlock = (type: string) => {
    if (type === "subpage") {
      const slash = content.lastIndexOf("/");
      const newContent = content.slice(0, slash);
      setContent(newContent);
      autoSave(title, newContent);
      setShowSlash(false);
      createDoc(activeDoc?.id);
      return;
    }
    const blocks: Record<string, string> = {
      heading1: "\n# ",
      heading2: "\n## ",
      list: "\n- ",
      checklist: "\n[ ] ",
      divider: "\n---\n",
      quote: "\n> ",
      toggle: "\n▸ Toggle: ",
      table: "\n| Coluna 1 | Coluna 2 |\n| valor 1 | valor 2 |\n",
      attachment: "\n📎 Nome do anexo :: https://",
    };
    const slash = content.lastIndexOf("/");
    const newContent = content.slice(0, slash) + (blocks[type] ?? "");
    setContent(newContent);
    autoSave(title, newContent);
    setShowSlash(false);
    setTimeout(() => textRef.current?.focus(), 50);
  };

  const exportTxt = () => {
    if (!activeDoc) return;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title || "documento"}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportPdf = () => {
    if (!activeDoc) return;
    const win = window.open("", "_blank");
    if (!win) return;
    const escaped = content
      .split("\n")
      .map((line) => line.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"))
      .join("<br/>");
    win.document.write(`
      <html>
        <head><title>${title}</title></head>
        <body style="font-family: Georgia, serif; padding: 40px; max-width: 700px; margin: 0 auto;">
          <h1>${title}</h1>
          <div style="white-space: pre-wrap; line-height: 1.6;">${escaped}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 250);
  };

  const renderContent = (raw: string) => {
    const lines = raw.split("\n");
    const nodes: React.ReactNode[] = [];
    let i = 0;
    while (i < lines.length) {
      const line = lines[i]!;
      if (line.startsWith("|")) {
        const tableLines: string[] = [];
        while (i < lines.length && lines[i]!.startsWith("|")) {
          tableLines.push(lines[i]!);
          i++;
        }
        const rows = tableLines.map(l => l.split("|").map(c => c.trim()).filter((_, idx, arr) => idx > 0 && idx < arr.length - 1));
        nodes.push(
          <table key={`t${i}`} className="w-full text-sm border-collapse my-2">
            <tbody>
              {rows.map((cells, ri) => (
                <tr key={ri} className={ri === 0 ? "font-bold text-[#C9A84C]" : "text-[var(--text-primary)]"}>
                  {cells.map((cell, ci) => (
                    <td key={ci} className="border border-[var(--surface-2)] px-2 py-1">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        );
        continue;
      }
      if (line.startsWith("# ")) nodes.push(<h1 key={i} className="text-2xl font-serif font-bold text-[var(--text-primary)] mt-4 mb-2">{line.slice(2)}</h1>);
      else if (line.startsWith("## ")) nodes.push(<h2 key={i} className="text-xl font-serif font-bold text-[var(--text-primary)] mt-3 mb-1">{line.slice(3)}</h2>);
      else if (line.startsWith("- ")) nodes.push(<li key={i} className="text-[var(--text-primary)] text-sm ml-4 list-disc">{line.slice(2)}</li>);
      else if (line.startsWith("[ ] ")) nodes.push(<div key={i} className="flex items-center gap-2"><span className="h-4 w-4 border border-[var(--text-subtle)] rounded" /><span className="text-sm text-[var(--text-primary)]">{line.slice(4)}</span></div>);
      else if (line.startsWith("[x] ")) nodes.push(<div key={i} className="flex items-center gap-2"><span className="h-4 w-4 bg-[#38A169] rounded flex items-center justify-center text-white text-xs">✓</span><span className="text-sm text-[var(--text-muted)] line-through">{line.slice(4)}</span></div>);
      else if (line === "---") nodes.push(<hr key={i} className="border-[var(--surface-2)] my-4" />);
      else if (line.startsWith("> ")) nodes.push(<blockquote key={i} className="border-l-4 border-[#C9A84C] pl-4 text-[var(--text-muted)] italic text-sm my-2">{line.slice(2)}</blockquote>);
      else if (line.startsWith("▸ Toggle: ")) nodes.push(
        <details key={i} className="text-sm text-[var(--text-primary)] my-1">
          <summary className="cursor-pointer text-[#C9A84C] font-medium">{line.slice(10) || "Toggle"}</summary>
        </details>
      );
      else if (line.startsWith("📎 ")) {
        const [name, url] = line.slice(2).split("::").map(s => s.trim());
        nodes.push(
          <a key={i} href={url || "#"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-sm text-[#C9A84C] hover:underline my-1">
            📎 {name || url}
          </a>
        );
      }
      else nodes.push(<p key={i} className="text-[var(--text-primary)] text-sm">{line || <br />}</p>);
      i++;
    }
    return nodes;
  };

  const rootDocs = docs.filter(d => !d.parentId);
  const childDocs = activeDoc ? docs.filter(d => d.parentId === activeDoc.id) : [];

  if (loading) return <div className="text-center py-20 text-[var(--text-subtle)]">Carregando...</div>;

  return (
    <div className="flex gap-4 h-full">
      {/* Sidebar */}
      <div className="w-56 shrink-0 space-y-1">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-serif font-bold text-[var(--text-primary)]">Documentos</h1>
          <button onClick={() => createDoc()} className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-[#C9A84C] hover:bg-[var(--surface-2)] transition-colors">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {rootDocs.length === 0 ? (
          <p className="text-xs text-[var(--text-subtle)] text-center py-4">Nenhum documento.</p>
        ) : (
          rootDocs.map(doc => (
            <div
              key={doc.id}
              onClick={() => openDoc(doc)}
              className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer group transition-colors ${activeDoc?.id === doc.id ? "bg-[var(--surface-2)] text-[#C9A84C]" : "text-[var(--text-muted)] hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"}`}
            >
              <span className="text-sm shrink-0">{doc.icon ?? "📄"}</span>
              <span className="text-sm truncate flex-1">{doc.title}</span>
              <button onClick={(e) => deleteDoc(doc.id, e)} className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-[#E53E3E] transition-all">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          ))
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 bg-[var(--surface-2)] rounded-xl border border-[var(--surface-1)] overflow-hidden card-depth flex flex-col">
        {activeDoc ? (
          <>
            {activeDoc.parentId && (
              <div className="px-6 pt-3">
                <button
                  onClick={() => {
                    const parent = docs.find(d => d.id === activeDoc.parentId);
                    if (parent) openDoc(parent);
                  }}
                  className="flex items-center gap-1.5 text-xs text-[var(--text-subtle)] hover:text-[#C9A84C] transition-colors"
                >
                  <ArrowLeft className="h-3 w-3" />
                  {docs.find(d => d.id === activeDoc.parentId)?.title || "Página anterior"}
                </button>
              </div>
            )}
            <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--surface-1)]">
              <Input
                value={title}
                onChange={(e) => { setTitle(e.target.value); autoSave(e.target.value, content); }}
                className="border-0 bg-transparent text-[var(--text-primary)] text-xl font-serif font-bold p-0 h-auto focus-visible:ring-0 shadow-none"
                placeholder="Título do documento"
              />
              <div className="flex items-center gap-3">
                {saving && <span className="text-xs text-[var(--text-subtle)]">Salvando...</span>}
                <button onClick={() => setPreviewMode(p => !p)} className="text-xs text-[var(--text-subtle)] hover:text-[#C9A84C] transition-colors">
                  {previewMode ? "Editar" : "Visualizar"}
                </button>
                <button onClick={exportTxt} className="text-xs text-[var(--text-subtle)] hover:text-[#C9A84C] transition-colors flex items-center gap-1" title="Exportar como .txt">
                  <Download className="h-3 w-3" /> TXT
                </button>
                <button onClick={exportPdf} className="text-xs text-[var(--text-subtle)] hover:text-[#C9A84C] transition-colors flex items-center gap-1" title="Exportar como PDF">
                  <FileDown className="h-3 w-3" /> PDF
                </button>
                <button onClick={() => createDoc(activeDoc.id)} className="text-xs text-[var(--text-subtle)] hover:text-[#C9A84C] transition-colors flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Subpágina
                </button>
              </div>
            </div>

            {childDocs.length > 0 && (
              <div className="px-6 py-2 border-b border-[var(--surface-1)] flex flex-wrap gap-2">
                {childDocs.map(child => (
                  <button key={child.id} onClick={() => openDoc(child)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-[var(--surface-1)] text-xs text-[var(--text-muted)] hover:text-[#C9A84C] transition-colors">
                    <ChevronRight className="h-3 w-3" /> {child.title}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto relative bg-[var(--surface-0)] py-8">
              {/* A4-proportioned page, colored to match the app's theme */}
              <div className="relative mx-auto w-full max-w-[794px] min-h-[1123px] bg-[var(--surface-2)] border border-[var(--surface-1)] rounded-sm shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
                {previewMode ? (
                  <div className="p-16 space-y-0.5">{renderContent(content)}</div>
                ) : (
                  <textarea
                    ref={textRef}
                    value={content}
                    onChange={handleContentChange}
                    placeholder='Comece a escrever... Use "/" para inserir blocos'
                    className="w-full min-h-[1123px] p-16 bg-transparent text-[var(--text-primary)] text-sm resize-none focus:outline-none placeholder:text-[var(--text-subtle)] font-mono leading-relaxed"
                  />
                )}

                {!previewMode && showSlash && (
                  <div ref={slashMenuRef} style={slashMenuStyle} className="bg-[var(--surface-0)] border border-[var(--surface-2)] rounded-lg shadow-xl z-20 w-48 overflow-hidden">
                  {[
                    { key: "heading1", label: "Título 1", icon: "H1" },
                    { key: "heading2", label: "Título 2", icon: "H2" },
                    { key: "list", label: "Lista com marcadores", icon: "•" },
                    { key: "checklist", label: "Checklist", icon: "☐" },
                    { key: "toggle", label: "Lista suspensa", icon: "▸" },
                    { key: "table", label: "Tabela", icon: "▦" },
                    { key: "attachment", label: "Anexo", icon: "📎" },
                    { key: "divider", label: "Divisor", icon: "—" },
                    { key: "quote", label: "Citação", icon: '"' },
                    { key: "subpage", label: "Subpágina", icon: "+" },
                  ].map(b => (
                    <button key={b.key} onClick={() => insertBlock(b.key)} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors text-left">
                      <span className="text-xs font-mono text-[#C9A84C] w-5">{b.icon}</span>
                      {b.label}
                    </button>
                  ))}
                  </div>
                )}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <FileText className="h-16 w-16 text-[#C9A84C] mb-4 opacity-30" />
            <p className="text-[var(--text-primary)] text-xl font-serif font-bold mb-2">Crie seu primeiro documento</p>
            <p className="text-[var(--text-muted)] text-sm mb-6">Use "/" para inserir blocos: títulos, listas, checklists e mais.</p>
            <Button onClick={() => createDoc()} className="btn-gold text-[var(--surface-0)] font-bold">
              <Plus className="h-4 w-4 mr-2" /> Novo documento
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
