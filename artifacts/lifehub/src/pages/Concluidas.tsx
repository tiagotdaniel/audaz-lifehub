import { useGetTasks } from "@workspace/api-client-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, Clock } from "lucide-react";
import { useState } from "react";
import TaskDetail from "@/components/tasks/TaskDetail";

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export default function Concluidas() {
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const { data: tasks, isLoading } = useGetTasks({ status: "done" });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)] mb-1">Concluidas</h1>
        <p className="text-[var(--text-muted)] text-sm">{tasks?.length ?? 0} tarefa{(tasks?.length ?? 0) !== 1 ? "s" : ""} concluida{(tasks?.length ?? 0) !== 1 ? "s" : ""}</p>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-[var(--text-subtle)]">Carregando...</div>
      ) : tasks?.length === 0 ? (
        <div className="text-center py-20">
          <CheckCircle2 className="h-12 w-12 text-[#38A169] mx-auto mb-3 opacity-40" />
          <p className="text-[var(--text-subtle)]">Nenhuma tarefa concluida ainda.</p>
          <p className="text-sm text-[var(--text-subtle)] mt-1">Suas conquistas aparecerao aqui!</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks?.map((task) => (
            <div
              key={task.id}
              data-testid={`task-done-${task.id}`}
              onClick={() => setSelectedTaskId(task.id)}
              className="flex items-center gap-3 p-4 bg-[var(--surface-2)] rounded-xl border border-[var(--surface-1)] hover:border-[#38A169]/40 cursor-pointer transition-all"
            >
              <CheckCircle2 className="h-5 w-5 text-[#38A169] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-[var(--text-muted)] line-through">{task.title}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {task.sector && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ color: task.sector.color, backgroundColor: task.sector.color + "22" }}>
                      {task.sector.label}
                    </span>
                  )}
                  <span className="text-xs text-[var(--text-subtle)]">
                    {task.updatedAt ? format(new Date(task.updatedAt), "d MMM yyyy", { locale: ptBR }) : ""}
                  </span>
                </div>
              </div>
              {(task.totalTimeSeconds ?? 0) > 0 && (
                <div className="flex items-center gap-1 text-xs text-[#C9A84C] font-mono font-bold">
                  <Clock className="h-3 w-3" />
                  {formatDuration(task.totalTimeSeconds ?? 0)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {selectedTaskId && <TaskDetail taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}
    </div>
  );
}
