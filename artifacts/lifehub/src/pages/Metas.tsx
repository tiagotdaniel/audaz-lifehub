import { useState } from "react";
import {
  useGetGoals,
  useCreateGoal,
  useUpdateGoal,
  useDeleteGoal,
  getGetGoalsQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Edit2, Check, Target } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface GoalForm {
  title: string;
  targetValue: number;
  currentValue: number;
  deadline: string;
}

export default function Metas() {
  const qc = useQueryClient();
  const { data: goals, isLoading } = useGetGoals();
  const createGoal = useCreateGoal();
  const updateGoal = useUpdateGoal();
  const deleteGoal = useDeleteGoal();

  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<GoalForm>({ title: "", targetValue: 100, currentValue: 0, deadline: "" });

  const handleOpen = (goal?: NonNullable<typeof goals>[0]) => {
    if (goal) {
      setEditId(goal.id);
      setForm({
        title: goal.title,
        targetValue: goal.targetValue,
        currentValue: goal.currentValue,
        deadline: goal.deadline ? new Date(goal.deadline).toISOString().split("T")[0] : "",
      });
    } else {
      setEditId(null);
      setForm({ title: "", targetValue: 100, currentValue: 0, deadline: "" });
    }
    setOpen(true);
  };

  const handleSave = () => {
    const payload = {
      title: form.title,
      targetValue: form.targetValue,
      currentValue: form.currentValue,
      deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
    };

    if (editId) {
      updateGoal.mutate({ id: editId, data: payload }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
          setOpen(false);
        },
      });
    } else {
      createGoal.mutate({ data: payload }, {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetGoalsQueryKey() });
          setOpen(false);
        },
      });
    }
  };

  const handleDelete = (id: string) => {
    deleteGoal.mutate({ id }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetGoalsQueryKey() }),
    });
  };

  const handleProgress = (goal: NonNullable<typeof goals>[0], delta: number) => {
    const newValue = Math.max(0, Math.min(goal.targetValue, goal.currentValue + delta));
    updateGoal.mutate({ id: goal.id, data: { currentValue: newValue } }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetGoalsQueryKey() }),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)] mb-1">Metas</h1>
          <p className="text-[var(--text-muted)] text-sm">{goals?.filter(g => g.status === "active").length ?? 0} meta{(goals?.filter(g => g.status === "active").length ?? 0) !== 1 ? "s" : ""} ativa{(goals?.filter(g => g.status === "active").length ?? 0) !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => handleOpen()} className="bg-[#C9A84C] hover:bg-[#E2C06E] text-[var(--surface-0)] font-bold">
          <Plus className="h-4 w-4 mr-2" />
          Nova Meta
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-[var(--text-subtle)]">Carregando...</div>
      ) : goals?.length === 0 ? (
        <div className="text-center py-20">
          <Target className="h-12 w-12 text-[#C9A84C] mx-auto mb-3 opacity-40" />
          <p className="text-[var(--text-subtle)]">Nenhuma meta cadastrada ainda.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {goals?.map((goal) => (
            <div key={goal.id} data-testid={`goal-card-${goal.id}`} className={`bg-[var(--surface-2)] rounded-xl p-6 border transition-colors ${goal.isAtRisk ? "border-[#E53E3E]/50" : "border-[var(--surface-1)] hover:border-[#C9A84C]/30"}`}>
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-[var(--text-primary)] font-semibold truncate">{goal.title}</h3>
                  {goal.deadline && (
                    <p className="text-xs text-[var(--text-subtle)] mt-1">
                      Prazo: {format(new Date(goal.deadline), "d 'de' MMMM yyyy", { locale: ptBR })}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 ml-3">
                  <button onClick={() => handleOpen(goal)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[#C9A84C] hover:bg-[var(--surface-1)] transition-colors">
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button onClick={() => handleDelete(goal.id)} className="p-2 rounded-lg text-[var(--text-muted)] hover:text-[#E53E3E] hover:bg-[var(--surface-1)] transition-colors">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-baseline">
                  <span className="text-2xl font-bold font-mono text-[#C9A84C]">{goal.currentValue}</span>
                  <span className="text-sm text-[var(--text-subtle)]">/ {goal.targetValue}</span>
                </div>
                <div className="h-2 rounded-full bg-[var(--surface-1)] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${goal.isAtRisk ? "bg-[#E53E3E]" : "bg-[#C9A84C]"}`}
                    style={{ width: `${goal.progressPercent ?? 0}%` }}
                  />
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-semibold" style={{ color: goal.isAtRisk ? "#E53E3E" : "#C9A84C" }}>
                    {Math.round(goal.progressPercent ?? 0)}%
                  </span>
                  {goal.isAtRisk && (
                    <span className="text-xs text-[#E53E3E] font-bold">EM RISCO</span>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button onClick={() => handleProgress(goal, -1)} className="flex-1 py-1.5 rounded-lg bg-[var(--surface-1)] text-[var(--text-muted)] text-sm font-bold hover:bg-[var(--surface-0)] transition-colors">
                  −1
                </button>
                <button onClick={() => handleProgress(goal, 1)} className="flex-1 py-1.5 rounded-lg bg-[#C9A84C] text-[var(--surface-0)] text-sm font-bold hover:bg-[#E2C06E] transition-colors">
                  +1
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)]">
          <DialogHeader>
            <DialogTitle className="text-[var(--text-primary)]">{editId ? "Editar Meta" : "Nova Meta"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div>
              <label className="text-xs text-[var(--text-subtle)] mb-1.5 block">Titulo</label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} className="bg-[var(--surface-0)] border-[var(--surface-2)] text-[var(--text-primary)] focus-visible:ring-[#C9A84C]" placeholder="Ex: Ler 12 livros" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-[var(--text-subtle)] mb-1.5 block">Meta</label>
                <Input type="number" value={form.targetValue} onChange={(e) => setForm(f => ({ ...f, targetValue: Number(e.target.value) }))} className="bg-[var(--surface-0)] border-[var(--surface-2)] text-[var(--text-primary)] focus-visible:ring-[#C9A84C]" />
              </div>
              <div>
                <label className="text-xs text-[var(--text-subtle)] mb-1.5 block">Atual</label>
                <Input type="number" value={form.currentValue} onChange={(e) => setForm(f => ({ ...f, currentValue: Number(e.target.value) }))} className="bg-[var(--surface-0)] border-[var(--surface-2)] text-[var(--text-primary)] focus-visible:ring-[#C9A84C]" />
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--text-subtle)] mb-1.5 block">Prazo (opcional)</label>
              <Input type="date" value={form.deadline} onChange={(e) => setForm(f => ({ ...f, deadline: e.target.value }))} className="bg-[var(--surface-0)] border-[var(--surface-2)] text-[var(--text-primary)] focus-visible:ring-[#C9A84C]" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => setOpen(false)} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancelar</Button>
              <Button onClick={handleSave} disabled={!form.title || createGoal.isPending || updateGoal.isPending} className="bg-[#C9A84C] hover:bg-[#E2C06E] text-[var(--surface-0)] font-bold">
                {editId ? "Salvar" : "Criar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
