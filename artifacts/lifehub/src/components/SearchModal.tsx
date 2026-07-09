import { useState, useEffect, useRef } from "react";
import { useGetTasks, useGetProjects, useGetGoals } from "@workspace/api-client-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Search, ListTodo, Briefcase, Target, X } from "lucide-react";
import { useLocation } from "wouter";

interface SearchModalProps { open: boolean; onClose: () => void; }

export default function SearchModal({ open, onClose }: SearchModalProps) {
  const [query, setQuery] = useState("");
  const [, setLocation] = useLocation();
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: tasks } = useGetTasks();
  const { data: projects } = useGetProjects();
  const { data: goals } = useGetGoals();

  useEffect(() => {
    if (open) {
      setQuery("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

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

  const total = filteredTasks.length + filteredProjects.length + filteredGoals.length;

  const navigate = (path: string) => { setLocation(path); onClose(); };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#162236] border-[#1A2B42] text-[#F0EBE3] sm:max-w-[560px] p-0 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[#1A2B42]">
          <Search className="h-5 w-5 text-[#6B7A8D] shrink-0" />
          <Input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar tarefas, projetos, metas..."
            className="border-0 bg-transparent text-[#F0EBE3] placeholder:text-[#6B7A8D] focus-visible:ring-0 shadow-none text-base p-0 h-auto"
            onKeyDown={(e) => e.key === "Escape" && onClose()}
          />
          <button onClick={onClose} className="text-[#6B7A8D] hover:text-[#F0EBE3] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-96 overflow-y-auto">
          {!q && (
            <div className="py-10 text-center text-sm text-[#6B7A8D]">
              Digite para pesquisar em tarefas, projetos e metas
            </div>
          )}

          {q && total === 0 && (
            <div className="py-10 text-center text-sm text-[#6B7A8D]">
              Nenhum resultado para "{query}"
            </div>
          )}

          {filteredTasks.length > 0 && (
            <div className="p-2">
              <p className="text-xs text-[#6B7A8D] uppercase tracking-widest px-2 py-1.5 flex items-center gap-1">
                <ListTodo className="h-3 w-3" /> Tarefas
              </p>
              {filteredTasks.map(task => (
                <button key={task.id} onClick={() => navigate("/tasks")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1A2B42] transition-colors text-left">
                  <ListTodo className="h-4 w-4 text-[#6B7A8D] shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm text-[#F0EBE3] truncate">{task.title}</p>
                    {task.sector && <p className="text-xs text-[#6B7A8D]">{task.sector.label}</p>}
                  </div>
                  <span className="text-xs ml-auto px-1.5 py-0.5 rounded-full shrink-0" style={{ color: task.sector?.color ?? "#6B7A8D", backgroundColor: (task.sector?.color ?? "#6B7A8D") + "22" }}>P{task.priority}</span>
                </button>
              ))}
            </div>
          )}

          {filteredProjects.length > 0 && (
            <div className="p-2 border-t border-[#1A2B42]">
              <p className="text-xs text-[#6B7A8D] uppercase tracking-widest px-2 py-1.5 flex items-center gap-1">
                <Briefcase className="h-3 w-3" /> Projetos
              </p>
              {filteredProjects.map(p => (
                <button key={p.id} onClick={() => navigate("/projetos")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1A2B42] transition-colors text-left">
                  <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                  <p className="text-sm text-[#F0EBE3] truncate">{p.name}</p>
                </button>
              ))}
            </div>
          )}

          {filteredGoals.length > 0 && (
            <div className="p-2 border-t border-[#1A2B42]">
              <p className="text-xs text-[#6B7A8D] uppercase tracking-widest px-2 py-1.5 flex items-center gap-1">
                <Target className="h-3 w-3" /> Metas
              </p>
              {filteredGoals.map(g => (
                <button key={g.id} onClick={() => navigate("/metas")} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#1A2B42] transition-colors text-left">
                  <Target className="h-4 w-4 text-[#6B7A8D] shrink-0" />
                  <p className="text-sm text-[#F0EBE3] truncate">{g.title}</p>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="px-4 py-2 border-t border-[#1A2B42] flex items-center gap-4 text-xs text-[#6B7A8D]">
          <span>↑↓ navegar</span>
          <span>↵ abrir</span>
          <span>Esc fechar</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
