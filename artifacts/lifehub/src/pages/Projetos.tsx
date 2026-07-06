import { useState } from "react";
import {
  useGetProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  useGetMilestones,
  useCreateMilestone,
  useUpdateMilestone,
  getGetProjectsQueryKey,
  getGetMilestonesQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Folder, Check } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Projetos() {
  const qc = useQueryClient();
  const { data: projects, isLoading } = useGetProjects();
  const { data: milestones } = useGetMilestones();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const createMilestone = useCreateMilestone();
  const updateMilestone = useUpdateMilestone();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", description: "", color: "#C9A84C", deadline: "" });
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState("");

  const handleOpen = (project?: NonNullable<typeof projects>[0]) => {
    if (project) {
      setEditId(project.id);
      setForm({
        name: project.name,
        description: project.description ?? "",
        color: project.color,
        deadline: project.deadline ? new Date(project.deadline).toISOString().split("T")[0] : "",
      });
    } else {
      setEditId(null);
      setForm({ name: "", description: "", color: "#C9A84C", deadline: "" });
    }
    setOpen(true);
  };

  const handleSave = () => {
    const payload = {
      name: form.name,
      description: form.description || undefined,
      color: form.color,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
    };
    if (editId) {
      updateProject.mutate({ id: editId, data: payload }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getGetProjectsQueryKey() }); setOpen(false); },
      });
    } else {
      createProject.mutate({ data: payload }, {
        onSuccess: () => { qc.invalidateQueries({ queryKey: getGetProjectsQueryKey() }); setOpen(false); },
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteProject.mutate({ id }, { onSuccess: () => qc.invalidateQueries({ queryKey: getGetProjectsQueryKey() }) });
  };

  const handleAddMilestone = (projectId: string) => {
    if (!milestoneTitle.trim()) return;
    createMilestone.mutate({ data: { title: milestoneTitle, projectId } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetMilestonesQueryKey() }); setMilestoneTitle(""); },
    });
  };

  const toggleMilestone = (id: string, done: boolean) => {
    updateMilestone.mutate({ id, data: { done: !done } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetMilestonesQueryKey() }),
    });
  };

  const COLORS = ["#C9A84C", "#E53E3E", "#38A169", "#3B82F6", "#9C27B0", "#ED8936", "#06B6D4"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#F0EBE3] mb-1">Projetos</h1>
          <p className="text-[#A89880] text-sm">{projects?.length ?? 0} projeto{(projects?.length ?? 0) !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => handleOpen()} className="bg-[#C9A84C] hover:bg-[#E2C06E] text-[#0D1B2A] font-bold">
          <Plus className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-[#6B7A8D]">Carregando...</div>
      ) : projects?.length === 0 ? (
        <div className="text-center py-20">
          <Folder className="h-12 w-12 text-[#C9A84C] mx-auto mb-3 opacity-40" />
          <p className="text-[#6B7A8D]">Nenhum projeto cadastrado ainda.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {projects?.map((project) => {
            const projectMilestones = milestones?.filter((m) => m.projectId === project.id) ?? [];
            const isExpanded = selectedProject === project.id;
            const progress = (project as any).taskCount > 0
              ? Math.round(((project as any).doneCount / (project as any).taskCount) * 100)
              : 0;

            return (
              <div key={project.id} data-testid={`project-card-${project.id}`} className="bg-[#1A2B42] rounded-xl border border-[#162236] hover:border-[#C9A84C]/30 transition-colors overflow-hidden">
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer"
                  onClick={() => setSelectedProject(isExpanded ? null : project.id)}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[#F0EBE3] font-semibold">{project.name}</p>
                    {project.description && <p className="text-xs text-[#6B7A8D] mt-0.5 truncate">{project.description}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-[#6B7A8D]">{(project as any).doneCount}/{(project as any).taskCount} tarefas</p>
                      <p className="text-xs text-[#C9A84C] font-bold">{progress}%</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); handleOpen(project); }} className="p-2 rounded-lg text-[#A89880] hover:text-[#C9A84C] hover:bg-[#162236] transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }} className="p-2 rounded-lg text-[#A89880] hover:text-[#E53E3E] hover:bg-[#162236] transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-[#162236]">
                  <div className="h-full transition-all" style={{ width: `${progress}%`, backgroundColor: project.color }} />
                </div>

                {/* Milestones (expanded) */}
                {isExpanded && (
                  <div className="p-5 border-t border-[#162236]">
                    <h3 className="text-xs text-[#6B7A8D] uppercase tracking-widest mb-3">Marcos</h3>
                    <div className="space-y-2 mb-3">
                      {projectMilestones.length === 0 && (
                        <p className="text-sm text-[#6B7A8D]">Nenhum marco adicionado.</p>
                      )}
                      {projectMilestones.map((m) => (
                        <div key={m.id} className="flex items-center gap-3">
                          <button onClick={() => toggleMilestone(m.id, m.done)} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${m.done ? "bg-[#38A169] border-[#38A169]" : "border-[#1A2B42] bg-transparent"}`}>
                            {m.done && <Check className="h-3 w-3 text-white" />}
                          </button>
                          <span className={`text-sm ${m.done ? "line-through text-[#6B7A8D]" : "text-[#F0EBE3]"}`}>{m.title}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={milestoneTitle}
                        onChange={(e) => setMilestoneTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddMilestone(project.id)}
                        placeholder="Adicionar marco..."
                        className="flex-1 bg-[#0D1B2A] border-[#1A2B42] text-[#F0EBE3] placeholder:text-[#6B7A8D] focus-visible:ring-[#C9A84C] h-8 text-sm"
                      />
                      <Button onClick={() => handleAddMilestone(project.id)} size="sm" disabled={!milestoneTitle.trim()} className="bg-[#C9A84C] hover:bg-[#E2C06E] text-[#0D1B2A] font-bold h-8">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#162236] border-[#1A2B42] text-[#F0EBE3]">
          <DialogHeader>
            <DialogTitle className="text-[#F0EBE3]">{editId ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs text-[#6B7A8D] mb-1.5 block">Nome</label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="bg-[#0D1B2A] border-[#1A2B42] text-[#F0EBE3] focus-visible:ring-[#C9A84C]" placeholder="Nome do projeto" />
            </div>
            <div>
              <label className="text-xs text-[#6B7A8D] mb-1.5 block">Descricao</label>
              <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="bg-[#0D1B2A] border-[#1A2B42] text-[#F0EBE3] focus-visible:ring-[#C9A84C]" placeholder="Opcional" />
            </div>
            <div>
              <label className="text-xs text-[#6B7A8D] mb-1.5 block">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? "ring-2 ring-offset-2 ring-offset-[#162236] scale-110" : "opacity-70 hover:opacity-100"}`} style={{ backgroundColor: c, ringColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-[#6B7A8D] mb-1.5 block">Prazo (opcional)</label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))} className="bg-[#0D1B2A] border-[#1A2B42] text-[#F0EBE3] focus-visible:ring-[#C9A84C]" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)} className="text-[#A89880] hover:text-[#F0EBE3]">Cancelar</Button>
              <Button onClick={handleSave} disabled={!form.name} className="bg-[#C9A84C] hover:bg-[#E2C06E] text-[#0D1B2A] font-bold">
                {editId ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
