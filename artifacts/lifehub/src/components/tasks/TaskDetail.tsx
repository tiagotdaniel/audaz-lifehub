import { useState } from "react";
import { useGetTask, useUpdateTask, useCompleteTask, useExecuteTask, getGetTasksQueryKey, getGetTaskQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTimerStore } from "@/store/timerStore";
import { X, Play, Check, Clock, Trash2, AlertTriangle, CalendarClock, SkipForward } from "lucide-react";
import { format, addDays, nextSaturday, nextMonday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
  onDeleted?: () => void;
}

const PRIORITY_COLORS: Record<number, string> = {
  1: "#E53E3E",
  2: "#ED8936",
  3: "#3B82F6",
  4: "#6B7280",
};

const PRIORITY_LABELS: Record<number, string> = {
  1: "P1 — Urgente",
  2: "P2 — Alta",
  3: "P3 — Média",
  4: "P4 — Sem prioridade",
};

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const SNOOZE_OPTIONS = [
  { label: "Amanhã", getValue: () => addDays(new Date(), 1) },
  { label: "+2 dias", getValue: () => addDays(new Date(), 2) },
  { label: "Fim de semana", getValue: () => nextSaturday(new Date()) },
  { label: "Próxima semana", getValue: () => nextMonday(new Date()) },
];

export default function TaskDetail({ taskId, onClose, onDeleted }: TaskDetailProps) {
  const qc = useQueryClient();
  const { setActive, reset: resetTimer } = useTimerStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const { data: task, isLoading } = useGetTask(taskId, {
    query: { enabled: !!taskId, queryKey: getGetTaskQueryKey(taskId) },
  });

  const executeTask = useExecuteTask();
  const completeTask = useCompleteTask();
  const updateTask = useUpdateTask();

  const handleExecute = () => {
    executeTask.mutate(
      { id: taskId },
      {
        onSuccess: (res) => {
          setActive(taskId, res.session.id);
          qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
          qc.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
        },
      }
    );
  };

  const handleComplete = () => {
    completeTask.mutate({ id: taskId }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        onClose();
      },
    });
  };

  const handleCancel = () => {
    updateTask.mutate({ id: taskId, data: { status: "cancelled" } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        onClose();
      },
    });
  };

  const handlePermanentDelete = async () => {
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/tasks/${taskId}/permanent`, { method: "DELETE" });
      if (res.ok) {
        resetTimer();
        qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        onDeleted?.();
        onClose();
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSnooze = (getValue: () => Date) => {
    const d = getValue();
    updateTask.mutate({ id: taskId, data: { dueDate: d.toISOString() } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
      },
    });
  };

  return (
    <>
      <Sheet open={!!taskId} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:w-[480px] bg-[#162236] border-[#1A2B42] text-[#F0EBE3] overflow-y-auto"
        >
          {isLoading || !task ? (
            <div className="text-center py-20 text-[#6B7A8D]">Carregando...</div>
          ) : (
            <>
              <SheetHeader className="mb-6">
                <div className="flex items-start gap-3">
                  <div
                    className="w-1 self-stretch rounded-full shrink-0 mt-1"
                    style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                  />
                  <div className="flex-1 min-w-0">
                    <SheetTitle className="text-[#F0EBE3] text-xl font-semibold leading-snug text-left font-serif">
                      {task.title}
                    </SheetTitle>
                    <p className="text-sm mt-1" style={{ color: PRIORITY_COLORS[task.priority] }}>
                      {PRIORITY_LABELS[task.priority]}
                    </p>
                  </div>
                </div>
              </SheetHeader>

              <div className="space-y-6">
                {/* Ações principais */}
                <div className="flex gap-2 flex-wrap">
                  {task.status === "pending" && (
                    <button
                      onClick={handleExecute}
                      disabled={executeTask.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C9A84C] text-[#0D1B2A] font-bold text-sm hover:bg-[#E2C06E] transition-colors"
                    >
                      <Play className="h-4 w-4" fill="currentColor" />
                      Executar
                    </button>
                  )}
                  {task.status !== "done" && task.status !== "cancelled" && (
                    <button
                      onClick={handleComplete}
                      disabled={completeTask.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#38A169] text-white font-bold text-sm hover:bg-[#48BB78] transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      Concluir
                    </button>
                  )}
                </div>

                {/* Adiar */}
                <div className="space-y-2">
                  <h3 className="text-xs text-[#6B7A8D] uppercase tracking-widest flex items-center gap-2">
                    <SkipForward className="h-3 w-3" />
                    Adiar para
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {SNOOZE_OPTIONS.map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => handleSnooze(opt.getValue)}
                        className="px-3 py-1.5 rounded-lg text-xs bg-[#1A2B42] text-[#A89880] hover:text-[#C9A84C] hover:bg-[#0D1B2A] border border-[#1A2B42] hover:border-[#C9A84C] transition-all"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Informações */}
                <div className="space-y-3">
                  {task.dueDate && (
                    <div className="flex justify-between">
                      <span className="text-xs text-[#6B7A8D] flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        Prazo
                      </span>
                      <span className="text-sm text-[#F0EBE3]">
                        {format(new Date(task.dueDate), "d MMM yyyy, HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  {task.sector && (
                    <div className="flex justify-between">
                      <span className="text-xs text-[#6B7A8D]">Setor</span>
                      <span className="text-sm px-2 py-0.5 rounded-full" style={{ color: task.sector.color, backgroundColor: task.sector.color + "22" }}>
                        {task.sector.label}
                      </span>
                    </div>
                  )}
                  {task.project && (
                    <div className="flex justify-between">
                      <span className="text-xs text-[#6B7A8D]">Projeto</span>
                      <span className="text-sm text-[#F0EBE3]">{task.project.name}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-xs text-[#6B7A8D] flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Tempo total
                    </span>
                    <span className="text-sm text-[#C9A84C] font-mono font-bold">
                      {task.totalTimeSeconds ? formatDuration(task.totalTimeSeconds) : "—"}
                    </span>
                  </div>
                </div>

                {/* Sessões de trabalho */}
                {task.timeSessions && task.timeSessions.length > 0 && (
                  <div>
                    <h3 className="text-xs text-[#6B7A8D] uppercase tracking-widest mb-3 flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      Sessões de trabalho
                    </h3>
                    <div className="space-y-2">
                      {task.timeSessions.map((session) => (
                        <div key={session.id} className="flex justify-between items-center p-2 rounded-lg bg-[#1A2B42] text-sm">
                          <span className="text-[#A89880]">
                            {format(new Date(session.startedAt), "d MMM, HH:mm", { locale: ptBR })}
                          </span>
                          <span className="text-[#C9A84C] font-mono font-bold">
                            {session.durationSeconds ? formatDuration(session.durationSeconds) : "Em andamento"}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Ações de exclusão */}
                <div className="pt-4 border-t border-[#1A2B42] space-y-2">
                  <h3 className="text-xs text-[#6B7A8D] uppercase tracking-widest mb-2">Ações</h3>
                  {task.status !== "cancelled" && (
                    <button
                      onClick={handleCancel}
                      className="w-full flex items-center gap-2 px-4 py-2 rounded-lg border border-[#ED8936] text-[#ED8936] text-sm hover:bg-[#ED8936]/10 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      Cancelar tarefa
                    </button>
                  )}
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E53E3E] text-[#E53E3E] text-sm hover:bg-[#E53E3E]/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir permanentemente
                  </button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-[#162236] border-[#1A2B42] text-[#F0EBE3]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#E53E3E] font-serif">
              <AlertTriangle className="h-5 w-5" />
              Excluir tarefa permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[#A89880]">
              Tem certeza? Esta ação não pode ser desfeita. A tarefa e todas as suas sessões de tempo serão removidas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[#1A2B42] border-[#1A2B42] text-[#F0EBE3] hover:bg-[#0D1B2A]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={isDeleting}
              className="bg-[#E53E3E] text-white hover:bg-[#C53030]"
            >
              {isDeleting ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
