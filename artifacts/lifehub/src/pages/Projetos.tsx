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
import { Plus, Trash2, Edit2, Folder, Check, Target, Paperclip, Link as LinkIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Kpi { name: string; target: number; current: number; }
interface ProjectAttachment { name: string; url: string; }

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
  const [form, setForm] = useState({ name: "", description: "", color: "#C9A84C", deadline: "", objective: "" });
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [newKpi, setNewKpi] = useState({ name: "", target: "" });
  const [newAttachment, setNewAttachment] = useState({ name: "", url: "" });

  const handleOpen = (project?: NonNullable<typeof projects>[0]) => {
    if (project) {
      setEditId(project.id);
      setForm({
        name: project.name,
        description: project.description ?? "",
        color: project.color,
        deadline: project.deadline ? new Date(project.deadline).toISOString().split("T")[0] : "",
        objective: (project as any).objective ?? "",
      });
    } else {
      setEditId(null);
      setForm({ name: "", description: "", color: "#C9A84C", deadline: "", objective: "" });
    }
    setOpen(true);
  };

  const handleSave = () => {
    const payload = {
      name: form.name,
      description: form.description || undefined,
      color: form.color,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
      objective: form.objective || undefined,
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

  const addKpi = (project: NonNullable<typeof projects>[0]) => {
    if (!newKpi.name.trim() || !newKpi.target) return;
    const kpis: Kpi[] = [...(((project as any).kpis as Kpi[]) ?? []), { name: newKpi.name, target: parseFloat(newKpi.target), current: 0 }];
    updateProject.mutate({ id: project.id, data: { kpis: kpis as any } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetProjectsQueryKey() }); setNewKpi({ name: "", target: "" }); },
    });
  };

  const updateKpiCurrent = (project: NonNullable<typeof projects>[0], idx: number, current: number) => {
    const kpis: Kpi[] = [...(((project as any).kpis as Kpi[]) ?? [])];
    kpis[idx] = { ...kpis[idx]!, current };
    updateProject.mutate({ id: project.id, data: { kpis: kpis as any } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetProjectsQueryKey() }),
    });
  };

  const removeKpi = (project: NonNullable<typeof projects>[0], idx: number) => {
    const kpis: Kpi[] = (((project as any).kpis as Kpi[]) ?? []).filter((_, i) => i !== idx);
    updateProject.mutate({ id: project.id, data: { kpis: kpis as any } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetProjectsQueryKey() }),
    });
  };

  const addAttachment = (project: NonNullable<typeof projects>[0]) => {
    if (!newAttachment.name.trim() || !newAttachment.url.trim()) return;
    const attachments: ProjectAttachment[] = [...(((project as any).attachments as ProjectAttachment[]) ?? []), { name: newAttachment.name, url: newAttachment.url }];
    updateProject.mutate({ id: project.id, data: { attachments: attachments as any } }, {
      onSuccess: () => { qc.invalidateQueries({ queryKey: getGetProjectsQueryKey() }); setNewAttachment({ name: "", url: "" }); },
    });
  };

  const removeAttachment = (project: NonNullable<typeof projects>[0], idx: number) => {
    const attachments: ProjectAttachment[] = (((project as any).attachments as ProjectAttachment[]) ?? []).filter((_, i) => i !== idx);
    updateProject.mutate({ id: project.id, data: { attachments: attachments as any } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetProjectsQueryKey() }),
    });
  };

  const COLORS = ["#C9A84C", "#E53E3E", "#38A169", "#3B82F6", "#9C27B0", "#ED8936", "#06B6D4"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)] mb-1">Projetos</h1>
          <p className="text-[var(--text-muted)] text-sm">{projects?.length ?? 0} projeto{(projects?.length ?? 0) !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => handleOpen()} className="bg-[#C9A84C] hover:bg-[#E2C06E] text-[var(--surface-0)] font-bold">
          <Plus className="h-4 w-4 mr-2" />
          Novo Projeto
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-[var(--text-subtle)]">Carregando...</div>
      ) : projects?.length === 0 ? (
        <div className="text-center py-20">
          <Folder className="h-12 w-12 text-[#C9A84C] mx-auto mb-3 opacity-40" />
          <p className="text-[var(--text-subtle)]">Nenhum projeto cadastrado ainda.</p>
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
              <div key={project.id} data-testid={`project-card-${project.id}`} className="bg-[var(--surface-2)] rounded-xl border border-[var(--surface-1)] hover:border-[#C9A84C]/30 transition-colors overflow-hidden">
                <div
                  className="flex items-center gap-4 p-5 cursor-pointer"
                  onClick={() => setSelectedProject(isExpanded ? null : project.id)}
                >
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: project.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-[var(--text-primary)] font-semibold">{project.name}</p>
                    {project.description && <p className="text-xs text-[var(--text-subtle)] mt-0.5 truncate">{project.description}</p>}
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-[var(--text-subtle)]">{(project as any).doneCount}/{(project as any).taskCount} tarefas</p>
                      <p className="text-xs text-[#C9A84C] font-bold">{progress}%</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={(e) => { e.stopPropagation(); handleOpen(project); }} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[#C9A84C] hover:bg-[var(--surface-1)] transition-colors">
                        <Edit2 className="h-4 w-4" />
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); handleDelete(project.id); }} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[#E53E3E] hover:bg-[var(--surface-1)] transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1 bg-[var(--surface-1)]">
                  <div className="h-full transition-all" style={{ width: `${progress}%`, backgroundColor: project.color }} />
                </div>

                {/* Expanded detail: Objetivo, KPIs, Marcos, Anexos */}
                {isExpanded && (
                  <div className="p-5 border-t border-[var(--surface-1)] space-y-5">
                    {(project as any).objective && (
                      <div>
                        <h3 className="text-xs text-[var(--text-subtle)] uppercase tracking-widest mb-2">Objetivo</h3>
                        <p className="text-sm text-[var(--text-primary)] whitespace-pre-wrap">{(project as any).objective}</p>
                      </div>
                    )}

                    <div>
                      <h3 className="text-xs text-[var(--text-subtle)] uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Target className="h-3 w-3" /> KPIs
                      </h3>
                      <div className="space-y-2 mb-3">
                        {(((project as any).kpis as Kpi[]) ?? []).length === 0 && (
                          <p className="text-sm text-[var(--text-subtle)]">Nenhum KPI definido.</p>
                        )}
                        {(((project as any).kpis as Kpi[]) ?? []).map((kpi, idx) => {
                          const pct = kpi.target > 0 ? Math.min((kpi.current / kpi.target) * 100, 100) : 0;
                          return (
                            <div key={idx} className="p-2.5 rounded-lg bg-[var(--surface-0)] group">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-[var(--text-primary)]">{kpi.name}</span>
                                <div className="flex items-center gap-2">
                                  <Input
                                    type="number"
                                    value={kpi.current}
                                    onChange={(e) => updateKpiCurrent(project, idx, parseFloat(e.target.value) || 0)}
                                    className="w-16 h-6 text-xs bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)] px-1"
                                  />
                                  <span className="text-xs text-[var(--text-subtle)]">/ {kpi.target}</span>
                                  <button onClick={() => removeKpi(project, idx)} className="opacity-0 group-hover:opacity-100 text-[var(--text-subtle)] hover:text-[#E53E3E]">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </div>
                              <div className="h-1 rounded-full bg-[var(--surface-2)] overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: project.color }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-2">
                        <Input value={newKpi.name} onChange={(e) => setNewKpi(f => ({ ...f, name: e.target.value }))} placeholder="Nome do KPI" className="flex-1 bg-[var(--surface-0)] border-[var(--surface-2)] text-[var(--text-primary)] h-8 text-sm" />
                        <Input type="number" value={newKpi.target} onChange={(e) => setNewKpi(f => ({ ...f, target: e.target.value }))} placeholder="Meta" className="w-20 bg-[var(--surface-0)] border-[var(--surface-2)] text-[var(--text-primary)] h-8 text-sm" />
                        <Button onClick={() => addKpi(project)} size="sm" className="bg-[#C9A84C] hover:bg-[#E2C06E] text-[var(--surface-0)] font-bold h-8"><Plus className="h-3 w-3" /></Button>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-xs text-[var(--text-subtle)] uppercase tracking-widest mb-3">Marcos</h3>
                    <div className="space-y-2 mb-3">
                      {projectMilestones.length === 0 && (
                        <p className="text-sm text-[var(--text-subtle)]">Nenhum marco adicionado.</p>
                      )}
                      {projectMilestones.map((m) => (
                        <div key={m.id} className="flex items-center gap-3">
                          <button onClick={() => toggleMilestone(m.id, m.done)} className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors shrink-0 ${m.done ? "bg-[#38A169] border-[#38A169]" : "border-[var(--surface-2)] bg-transparent"}`}>
                            {m.done && <Check className="h-3 w-3 text-white" />}
                          </button>
                          <span className={`text-sm ${m.done ? "line-through text-[var(--text-subtle)]" : "text-[var(--text-primary)]"}`}>{m.title}</span>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <Input
                        value={milestoneTitle}
                        onChange={(e) => setMilestoneTitle(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleAddMilestone(project.id)}
                        placeholder="Adicionar marco..."
                        className="flex-1 bg-[var(--surface-0)] border-[var(--surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus-visible:ring-[#C9A84C] h-8 text-sm"
                      />
                      <Button onClick={() => handleAddMilestone(project.id)} size="sm" disabled={!milestoneTitle.trim()} className="bg-[#C9A84C] hover:bg-[#E2C06E] text-[var(--surface-0)] font-bold h-8">
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    </div>

                    <div>
                      <h3 className="text-xs text-[var(--text-subtle)] uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Paperclip className="h-3 w-3" /> Anexos
                      </h3>
                      <div className="space-y-1.5 mb-3">
                        {(((project as any).attachments as ProjectAttachment[]) ?? []).length === 0 && (
                          <p className="text-sm text-[var(--text-subtle)]">Nenhum anexo.</p>
                        )}
                        {(((project as any).attachments as ProjectAttachment[]) ?? []).map((att, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-0)] text-sm group">
                            <a href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#C9A84C] hover:underline truncate">
                              <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{att.name}</span>
                            </a>
                            <button onClick={() => removeAttachment(project, idx)} className="opacity-0 group-hover:opacity-100 text-[var(--text-subtle)] hover:text-[#E53E3E] shrink-0">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input value={newAttachment.name} onChange={(e) => setNewAttachment(f => ({ ...f, name: e.target.value }))} placeholder="Nome" className="flex-1 bg-[var(--surface-0)] border-[var(--surface-2)] text-[var(--text-primary)] h-8 text-sm" />
                        <Input value={newAttachment.url} onChange={(e) => setNewAttachment(f => ({ ...f, url: e.target.value }))} placeholder="Link (URL)" className="flex-[2] bg-[var(--surface-0)] border-[var(--surface-2)] text-[var(--text-primary)] h-8 text-sm" />
                        <Button onClick={() => addAttachment(project)} size="sm" className="bg-[#C9A84C] hover:bg-[#E2C06E] text-[var(--surface-0)] font-bold h-8"><Plus className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">{editId ? "Editar Projeto" : "Novo Projeto"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs text-[var(--text-subtle)] mb-1.5 block">Nome</label>
              <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="bg-[var(--surface-0)] border-[var(--surface-2)] text-[var(--text-primary)] focus-visible:ring-[#C9A84C]" placeholder="Nome do projeto" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-subtle)] mb-1.5 block">Descricao</label>
              <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} className="bg-[var(--surface-0)] border-[var(--surface-2)] text-[var(--text-primary)] focus-visible:ring-[#C9A84C]" placeholder="Opcional" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-subtle)] mb-1.5 block">Objetivo</label>
              <Textarea value={form.objective} onChange={(e) => setForm(f => ({ ...f, objective: e.target.value }))} className="bg-[var(--surface-0)] border-[var(--surface-2)] text-[var(--text-primary)] focus-visible:ring-[#C9A84C] resize-none h-20" placeholder="Qual o objetivo deste projeto?" />
            </div>
            <div>
              <label className="text-xs text-[var(--text-subtle)] mb-1.5 block">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? "ring-2 ring-offset-2 ring-offset-[var(--surface-1)] scale-110" : "opacity-70 hover:opacity-100"}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--text-subtle)] mb-1.5 block">Prazo (opcional)</label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))} className="bg-[var(--surface-0)] border-[var(--surface-2)] text-[var(--text-primary)] focus-visible:ring-[#C9A84C]" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancelar</Button>
              <Button onClick={handleSave} disabled={!form.name} className="bg-[#C9A84C] hover:bg-[#E2C06E] text-[var(--surface-0)] font-bold">
                {editId ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
