import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";
import { Plus, Trash2, FileText, ChevronRight, ArrowLeft } from "lucide-react";
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
  const textRef = useRef<HTMLTextAreaElement>(null);
  const saveTimer = useRef<NodeJS.Timeout>();

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

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setContent(val);
    autoSave(title, val);
    const lastChar = val[val.length - 1];
    if (lastChar === "/") {
      const rect = e.target.getBoundingClientRect();
      setSlashPos({ x: 0, y: 0 });
      setShowSlash(true);
    } else {
      setShowSlash(false);
    }
  };

  const insertBlock = (type: string) => {
    const blocks: Record<string, string> = {
      heading1: "\n# ",
      heading2: "\n## ",
      list: "\n- ",
      checklist: "\n[ ] ",
      divider: "\n---\n",
      quote: "\n> ",
    };
    const slash = content.lastIndexOf("/");
    const newContent = content.slice(0, slash) + (blocks[type] ?? "");
    setContent(newContent);
    autoSave(title, newContent);
    setShowSlash(false);
    setTimeout(() => textRef.current?.focus(), 50);
  };

  const renderContent = (raw: string) => {
    return raw
      .split("\n")
      .map((line, i) => {
        if (line.startsWith("# ")) return <h1 key={i} className="text-2xl font-serif font-bold text-[#F0EBE3] mt-4 mb-2">{line.slice(2)}</h1>;
        if (line.startsWith("## ")) return <h2 key={i} className="text-xl font-serif font-bold text-[#F0EBE3] mt-3 mb-1">{line.slice(3)}</h2>;
        if (line.startsWith("- ")) return <li key={i} className="text-[#F0EBE3] text-sm ml-4 list-disc">{line.slice(2)}</li>;
        if (line.startsWith("[ ] ")) return <div key={i} className="flex items-center gap-2"><span className="h-4 w-4 border border-[#6B7A8D] rounded" /><span className="text-sm text-[#F0EBE3]">{line.slice(4)}</span></div>;
        if (line.startsWith("[x] ")) return <div key={i} className="flex items-center gap-2"><span className="h-4 w-4 bg-[#38A169] rounded flex items-center justify-center text-white text-xs">✓</span><span className="text-sm text-[#A89880] line-through">{line.slice(4)}</span></div>;
        if (line === "---") return <hr key={i} className="border-[#1A2B42] my-4" />;
        if (line.startsWith("> ")) return <blockquote key={i} className="border-l-4 border-[#C9A84C] pl-4 text-[#A89880] italic text-sm my-2">{line.slice(2)}</blockquote>;
        return <p key={i} className="text-[#F0EBE3] text-sm">{line || <br />}</p>;
      });
  };

  const rootDocs = docs.filter(d => !d.parentId);
  const childDocs = activeDoc ? docs.filter(d => d.parentId === activeDoc.id) : [];

  if (loading) return <div className="text-center py-20 text-[#6B7A8D]">Carregando...</div>;

  return (
    <div className="flex gap-4 h-full">
      {/* Sidebar */}
      <div className="w-56 shrink-0 space-y-1">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-serif font-bold text-[#F0EBE3]">Documentos</h1>
          <button onClick={() => createDoc()} className="p-1.5 rounded-lg text-[#6B7A8D] hover:text-[#C9A84C] hover:bg-[#1A2B42] transition-colors">
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {rootDocs.length === 0 ? (
          <p className="text-xs text-[#6B7A8D] text-center py-4">Nenhum documento.</p>
        ) : (
          rootDocs.map(doc => (
            <div
              key={doc.id}
              onClick={() => openDoc(doc)}
              className={`flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer group transition-colors ${activeDoc?.id === doc.id ? "bg-[#1A2B42] text-[#C9A84C]" : "text-[#A89880] hover:bg-[#162236] hover:text-[#F0EBE3]"}`}
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
      <div className="flex-1 bg-[#1A2B42] rounded-xl border border-[#162236] overflow-hidden card-depth flex flex-col">
        {activeDoc ? (
          <>
            <div className="flex items-center justify-between px-6 py-3 border-b border-[#162236]">
              <Input
                value={title}
                onChange={(e) => { setTitle(e.target.value); autoSave(e.target.value, content); }}
                className="border-0 bg-transparent text-[#F0EBE3] text-xl font-serif font-bold p-0 h-auto focus-visible:ring-0 shadow-none"
                placeholder="Título do documento"
              />
              <div className="flex items-center gap-3">
                {saving && <span className="text-xs text-[#6B7A8D]">Salvando...</span>}
                <button onClick={() => createDoc(activeDoc.id)} className="text-xs text-[#6B7A8D] hover:text-[#C9A84C] transition-colors flex items-center gap-1">
                  <Plus className="h-3 w-3" /> Subpágina
                </button>
              </div>
            </div>

            {childDocs.length > 0 && (
              <div className="px-6 py-2 border-b border-[#162236] flex flex-wrap gap-2">
                {childDocs.map(child => (
                  <button key={child.id} onClick={() => openDoc(child)} className="flex items-center gap-1 px-2 py-1 rounded-md bg-[#162236] text-xs text-[#A89880] hover:text-[#C9A84C] transition-colors">
                    <ChevronRight className="h-3 w-3" /> {child.title}
                  </button>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto relative">
              <textarea
                ref={textRef}
                value={content}
                onChange={handleContentChange}
                placeholder='Comece a escrever... Use "/" para inserir blocos'
                className="w-full h-full min-h-full p-6 bg-transparent text-[#F0EBE3] text-sm resize-none focus:outline-none placeholder:text-[#6B7A8D] font-mono leading-relaxed"
              />

              {showSlash && (
                <div className="absolute left-6 bg-[#0D1B2A] border border-[#1A2B42] rounded-lg shadow-xl z-20 w-48 overflow-hidden">
                  {[
                    { key: "heading1", label: "Título 1", icon: "H1" },
                    { key: "heading2", label: "Título 2", icon: "H2" },
                    { key: "list", label: "Lista com marcadores", icon: "•" },
                    { key: "checklist", label: "Checklist", icon: "☐" },
                    { key: "divider", label: "Divisor", icon: "—" },
                    { key: "quote", label: "Citação", icon: '"' },
                  ].map(b => (
                    <button key={b.key} onClick={() => insertBlock(b.key)} className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[#F0EBE3] hover:bg-[#1A2B42] transition-colors text-left">
                      <span className="text-xs font-mono text-[#C9A84C] w-5">{b.icon}</span>
                      {b.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <FileText className="h-16 w-16 text-[#C9A84C] mb-4 opacity-30" />
            <p className="text-[#F0EBE3] text-xl font-serif font-bold mb-2">Crie seu primeiro documento</p>
            <p className="text-[#A89880] text-sm mb-6">Use "/" para inserir blocos: títulos, listas, checklists e mais.</p>
            <Button onClick={() => createDoc()} className="btn-gold text-[#0D1B2A] font-bold">
              <Plus className="h-4 w-4 mr-2" /> Novo documento
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
