import { useState } from "react";
import { useGetTasks, useCompleteTask, useExecuteTask, getGetTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTimerStore } from "@/store/timerStore";
import { AlertTriangle, Play, Check, Clock } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import TaskDetail from "@/components/tasks/TaskDetail";

const PRIORITY_COLORS: Record<number, string> = {
  1: "#E53E3E", 2: "#ED8936", 3: "#3B82F6", 4: "#6B7280",
};

export default function Atrasadas() {
  const qc = useQueryClient();
  const { setActive } = useTimerStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: tasks, isLoading } = useGetTasks();
  const completeTask = useCompleteTask();
  const executeTask = useExecuteTask();

  const now = new Date();
  const overdue = (tasks ?? []).filter(t =>
    t.dueDate &&
    new Date(t.dueDate) < now &&
    t.status !== "done" &&
    t.status !== "cancelled"
  ).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime());

  const handleExecute = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    executeTask.mutate({ id: taskId }, {
      onSuccess: (res) => {
        setActive(taskId, res.session.id);
        qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
      },
    });
  };

  const handleComplete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    completeTask.mutate({ id: taskId }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetTasksQueryKey() }),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#F0EBE3] mb-1 flex items-center gap-3">
          <AlertTriangle className="h-7 w-7 text-[#E53E3E]" />
          Tarefas Atrasadas
        </h1>
        <p className="text-[#A89880] text-sm">
          {overdue.length} tarefa{overdue.length !== 1 ? "s" : ""} atrasada{overdue.length !== 1 ? "s" : ""}
        </p>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-[#6B7A8D]">Carregando...</div>
      ) : overdue.length === 0 ? (
        <div className="text-center py-20">
          <AlertTriangle className="h-12 w-12 text-[#38A169] mx-auto mb-3 opacity-40" />
          <p className="text-[#6B7A8D] font-medium">Nenhuma tarefa atrasada!</p>
          <p className="text-sm text-[#6B7A8D] mt-1">Continue assim. Você está em dia.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {overdue.map((task) => {
            const daysLate = differenceInDays(now, new Date(task.dueDate!));
            return (
              <div
                key={task.id}
                onClick={() => setSelectedTaskId(task.id)}
                className="flex items-center gap-3 p-4 bg-[#1A2B42] rounded-xl border border-[#E53E3E]/30 task-overdue cursor-pointer hover:border-[#E53E3E]/60 transition-all group"
              >
                <div className="w-1 self-stretch rounded-full shrink-0 bg-[#E53E3E]" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[#F0EBE3] truncate">{task.title}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-xs text-[#E53E3E] font-bold flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {daysLate === 0 ? "Hoje" : `${daysLate}d atraso`}
                    </span>
                    {task.dueDate && (
                      <span className="text-xs text-[#6B7A8D]">
                        Prazo: {format(new Date(task.dueDate), "d MMM", { locale: ptBR })}
                      </span>
                    )}
                    {task.sector && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ color: task.sector.color, backgroundColor: task.sector.color + "22" }}>
                        {task.sector.label}
                      </span>
                    )}
                    <span className="text-xs font-bold" style={{ color: PRIORITY_COLORS[task.priority] }}>P{task.priority}</span>
                  </div>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleExecute(task.id, e)}
                    className="p-2 rounded-lg text-[#C9A84C] hover:bg-[#C9A84C] hover:text-[#0D1B2A] transition-colors"
                    title="Executar"
                  >
                    <Play className="h-3.5 w-3.5" fill="currentColor" />
                  </button>
                  <button
                    onClick={(e) => handleComplete(task.id, e)}
                    className="p-2 rounded-lg text-[#38A169] hover:bg-[#38A169] hover:text-white transition-colors"
                    title="Concluir"
                  >
                    <Check className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTaskId && <TaskDetail taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}
    </div>
  );
}
