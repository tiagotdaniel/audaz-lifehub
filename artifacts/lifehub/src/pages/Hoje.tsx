import { useGetTasks, useCompleteTask, useExecuteTask, getGetTasksQueryKey, getGetTaskQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTimerStore } from "@/store/timerStore";
import { format, isToday, isPast, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Play, Check } from "lucide-react";
import { useState } from "react";
import TaskDetail from "@/components/tasks/TaskDetail";

const PRIORITY_COLORS: Record<number, string> = { 1: "#E53E3E", 2: "#ED8936", 3: "#3B82F6", 4: "#6B7280" };

export default function Hoje() {
  const qc = useQueryClient();
  const { setActive } = useTimerStore();
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const { data: allTasks } = useGetTasks({});
  const completeTask = useCompleteTask();
  const executeTask = useExecuteTask();

  const today = startOfDay(new Date());
  const todayTasks = allTasks?.filter((t) => t.dueDate && isToday(new Date(t.dueDate))) ?? [];
  const overdueTasks = allTasks?.filter((t) => t.dueDate && isPast(new Date(t.dueDate)) && !isToday(new Date(t.dueDate)) && t.status !== "done" && t.status !== "cancelled") ?? [];

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
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        qc.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
      },
    });
  };

  const TaskRow = ({ task }: { task: NonNullable<typeof allTasks>[0] }) => (
    <div
      data-testid={`task-today-row-${task.id}`}
      onClick={() => setSelectedTaskId(task.id)}
      className="flex items-center gap-3 p-4 bg-[var(--surface-2)] rounded-xl border border-[var(--surface-1)] hover:border-[#C9A84C]/40 cursor-pointer transition-all group"
    >
      <div className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: PRIORITY_COLORS[task.priority] }} />
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-[var(--text-subtle)]" : "text-[var(--text-primary)]"}`}>
          {task.title}
        </p>
        {task.sector && (
          <span className="text-xs px-1.5 py-0.5 rounded-full mt-1 inline-block" style={{ color: task.sector.color, backgroundColor: task.sector.color + "22" }}>
            {task.sector.label}
          </span>
        )}
      </div>
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        {task.status === "pending" && (
          <button onClick={(e) => handleExecute(task.id, e)} className="p-2 rounded-lg text-[#C9A84C] hover:bg-[#C9A84C] hover:text-[var(--surface-0)] transition-colors" title="Executar">
            <Play className="h-4 w-4" fill="currentColor" />
          </button>
        )}
        {task.status !== "done" && task.status !== "cancelled" && (
          <button onClick={(e) => handleComplete(task.id, e)} className="p-2 rounded-lg text-[#38A169] hover:bg-[#38A169] hover:text-white transition-colors" title="Concluir">
            <Check className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)] mb-1">Hoje</h1>
        <p className="text-[var(--text-muted)] text-sm">{format(new Date(), "EEEE, d 'de' MMMM yyyy", { locale: ptBR })}</p>
      </div>

      {overdueTasks.length > 0 && (
        <div>
          <h2 className="text-xs font-semibold text-[#E53E3E] uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#E53E3E]" />
            Atrasadas ({overdueTasks.length})
          </h2>
          <div className="space-y-2">
            {overdueTasks.map((task) => <TaskRow key={task.id} task={task} />)}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-3 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#C9A84C]" />
          Para hoje ({todayTasks.length})
        </h2>
        {todayTasks.length === 0 ? (
          <div className="text-center py-12 text-[var(--text-subtle)]">
            <p>Nenhuma tarefa para hoje.</p>
            <p className="text-sm mt-1">Use o campo acima para adicionar uma!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todayTasks.map((task) => <TaskRow key={task.id} task={task} />)}
          </div>
        )}
      </div>

      {selectedTaskId && <TaskDetail taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}
    </div>
  );
}
