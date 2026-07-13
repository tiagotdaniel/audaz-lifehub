import { useState, useEffect, useRef } from "react";
import { useGetTasks, useGetProjects, useGetGoals } from "@workspace/api-client-react";
import { useAuth } from "@clerk/react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, ListTodo, Briefcase, Target, X, FileText, List, Image } from "lucide-react";
import { useLocation } from "wouter";

interface SearchModalProps { open: boolean; onClose: () => void; }
interface DocResult { id: string; title: string; }
interface ListItemResult { itemId: string; listId: string; title: string; listName: string; }
interface DreamResult { id: string; quote: string; }

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);
  const { getToken } = useAuth();

  const { data: tasks } = useGetTasks();
  const { data: projects } = useGetProjects();
  const { data: goals } = useGetGoals();

  const [docs, setDocs] = useState<DocResult[]>([]);
  const [listItems, setListItems] = useState<ListItemResult[]>([]);
  const [dreams, setDreams] = useState<DreamResult[]>([]);

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
      (async () => {
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };
        const [docsRes, listsRes, dreamsRes] = await Promise.all([
          fetch("/api/documents", { headers }).then(r => r.json()).catch(() => []),
          fetch("/api/lists", { headers }).then(r => r.json()).catch(() => []),
          fetch("/api/dream-board", { headers }).then(r => r.json()).catch(() => []),
        ]);
        setDocs(Array.isArray(docsRes) ? docsRes : []);
        setListItems(
          Array.isArray(listsRes)
            ? listsRes.flatMap((l: any) => (l.items ?? []).map((i: any) => ({ itemId: i.id, listId: l.id, title: i.title, listName: l.name })))
            : []
        );
        setDreams(Array.isArray(dreamsRes) ? dreamsRes : []);
      })();
    }
  }, [open, getToken]);

  const q = query.toLowerCase().trim();

  const filteredTasks = q ? (tasks ?? []).filter(t =>
    t.title.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
  ).slice(0, 5) : [];

  const filteredProjects = q ? (projects ?? []).filter(p =>
    p.name.toLowerCase().includes(q) || p.description?.toLowerCase().includes(q)
  ).slice(0, 3) : [];

  const filteredGoals = q ? (goals ?? []).filter(g =>
    g.title.toLowerCase().includes(q)
  ).slice(0, 3) : [];

  const filteredDocs = q ? docs.filter(d => d.title.toLowerCase().includes(q)).slice(0, 3) : [];
  const filteredListItems = q ? listItems.filter(i => i.title.toLowerCase().includes(q)).slice(0, 3) : [];
  const filteredDreams = q ? dreams.filter(d => d.quote?.toLowerCase().includes(q)).slice(0, 3) : [];

  const total = filteredTasks.length + filteredProjects.length + filteredGoals.length + filteredDocs.length + filteredListItems.length + filteredDreams.length;

  const navigate = (path: string) => { setLocation(path); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] sm:max-w-[560px] p-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--surface-2)]">
          <Search className="h-5 w-5 text-[var(--text-subtle)] shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar tarefas, projetos, metas, documentos..."
            className="border-0 bg-transparent text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus-visible:ring-0 shadow-none text-base p-0 h-auto"
            onKeyDown={(e) => e.key === "Escape" && onClose()}
          />
          <button onClick={onClose} className="text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {!q && (
            <div className="py-10 text-center text-sm text-[var(--text-subtle)]">
              Digite para pesquisar em tarefas, projetos, metas, documentos, listas e mural dos sonhos
            </div>
          )}

          {q && total === 0 && (
            <div className="py-10 text-center text-sm text-[var(--text-subtle)]">
              Nenhum resultado para "{query}"
            </div>
          )}

          {filteredTasks.length > 0 && (
            <div className="p-2">
              <p className="text-xs text-[var(--text-subtle)] uppercase tracking-widest px-2 py-1.5 flex items-center gap-1">
                <ListTodo className="h-3 w-3" /> Tarefas
              </p>
              {filteredTasks.map(task => (
                <button key={task.id} onClick={() => navigate("/tasks")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-left">
                  <ListTodo className="h-4 w-4 text-[var(--text-subtle)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--text-primary)] truncate">{task.title}</p>
                    {task.sector && <p className="text-xs text-[var(--text-subtle)]">{task.sector.label}</p>}
                  </div>
                  <span className="text-xs ml-auto px-1.5 py-0.5 rounded-full shrink-0" style={{ color: task.sector?.color ?? "#6B7A8D", backgroundColor: (task.sector?.color ?? "#6B7A8D") + "22" }}>P{task.priority}</span>
                </button>
              ))}
            </div>
          )}

          {filteredProjects.length > 0 && (
            <div className="p-2 border-t border-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-subtle)] uppercase tracking-widest px-2 py-1.5 flex items-center gap-1">
                <Briefcase className="h-3 w-3" /> Projetos
              </p>
              {filteredProjects.map(p => (
                <button key={p.id} onClick={() => navigate("/projetos")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-left">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <p className="text-sm text-[var(--text-primary)] truncate">{p.name}</p>
                </button>
              ))}
            </div>
          )}

          {filteredGoals.length > 0 && (
            <div className="p-2 border-t border-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-subtle)] uppercase tracking-widest px-2 py-1.5 flex items-center gap-1">
                <Target className="h-3 w-3" /> Metas
              </p>
              {filteredGoals.map(g => (
                <button key={g.id} onClick={() => navigate("/metas")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-left">
                  <Target className="h-4 w-4 text-[var(--text-subtle)] shrink-0" />
                  <p className="text-sm text-[var(--text-primary)] truncate">{g.title}</p>
                </button>
              ))}
            </div>
          )}

          {filteredDocs.length > 0 && (
            <div className="p-2 border-t border-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-subtle)] uppercase tracking-widest px-2 py-1.5 flex items-center gap-1">
                <FileText className="h-3 w-3" /> Documentos
              </p>
              {filteredDocs.map(d => (
                <button key={d.id} onClick={() => navigate("/documentos")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-left">
                  <FileText className="h-4 w-4 text-[var(--text-subtle)] shrink-0" />
                  <p className="text-sm text-[var(--text-primary)] truncate">{d.title}</p>
                </button>
              ))}
            </div>
          )}

          {filteredListItems.length > 0 && (
            <div className="p-2 border-t border-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-subtle)] uppercase tracking-widest px-2 py-1.5 flex items-center gap-1">
                <List className="h-3 w-3" /> Itens de lista
              </p>
              {filteredListItems.map(i => (
                <button key={i.itemId} onClick={() => navigate("/listas")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-left">
                  <List className="h-4 w-4 text-[var(--text-subtle)] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--text-primary)] truncate">{i.title}</p>
                    <p className="text-xs text-[var(--text-subtle)]">{i.listName}</p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {filteredDreams.length > 0 && (
            <div className="p-2 border-t border-[var(--surface-2)]">
              <p className="text-xs text-[var(--text-subtle)] uppercase tracking-widest px-2 py-1.5 flex items-center gap-1">
                <Image className="h-3 w-3" /> Mural dos sonhos
              </p>
              {filteredDreams.map(d => (
                <button key={d.id} onClick={() => navigate("/mural")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[var(--surface-2)] transition-colors text-left">
                  <Image className="h-4 w-4 text-[var(--text-subtle)] shrink-0" />
                  <p className="text-sm text-[var(--text-primary)] truncate">{d.quote}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-[var(--surface-2)] flex items-center gap-4 text-xs text-[var(--text-subtle)]">
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>Esc fechar</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
