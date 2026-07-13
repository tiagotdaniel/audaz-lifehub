import { useState } from "react";
import {
  useGetTasks,
  useGetSectors,
  useGetProjects,
  useCompleteTask,
  useDeleteTask,
  useExecuteTask,
  getGetTasksQueryKey,
  getGetTaskQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTimerStore } from "@/store/timerStore";
import { Play, Check, Trash2, List, Columns, CalendarDays, AlertTriangle } from "lucide-react";
import { format, isValid } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import TaskDetail from "@/components/tasks/TaskDetail";

const PRIORITY_COLORS: Record<number, string> = {
  1: "#E53E3E",
  2: "#ED8936",
  3: "#3B82F6",
  4: "#6B7280",
};

const STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  executing: "Executando",
  paused: "Pausado",
  done: "Concluido",
  cancelled: "Cancelado",
};

const STATUS_COLORS: Record<string, string> = {
  pending: "#6B7280",
  executing: "#C9A84C",
  paused: "#ED8936",
  done: "#38A169",
  cancelled: "#E53E3E",
};

type ViewMode = "list" | "kanban";

export default function Tasks() {
  const qc = useQueryClient();
  const { setActive } = useTimerStore();
  const [view, setView] = useState<ViewMode>("list");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const params: Record<string, string> = {};
  if (filterStatus !== "all" && filterStatus !== "atrasadas") params.status = filterStatus;
  if (filterPriority !== "all") params.priority = filterPriority;

  const { data: rawTasks, isLoading } = useGetTasks(params);
  const now = new Date();
  const isOverdue = (t: NonNullable<typeof rawTasks>[number]) =>
    !!t.dueDate && new Date(t.dueDate) < now && t.status !== "done" && t.status !== "cancelled";
  const tasks = filterStatus === "atrasadas" ? (rawTasks ?? []).filter(isOverdue) : rawTasks;
  const { data: sectors } = useGetSectors();
  const { data: projects } = useGetProjects();
  const completeTask = useCompleteTask();
  const deleteTask = useDeleteTask();
  const executeTask = useExecuteTask();

  const handleExecute = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    executeTask.mutate(
      { id: taskId },
      {
        onSuccess: (res) => {
          setActive(taskId, res.session.id);
          qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        },
      }
    );
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

  const handleDelete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (useTimerStore.getState().activeTaskId === taskId) useTimerStore.getState().reset();
    deleteTask.mutate({ id: taskId }, {
      onSuccess: () => qc.invalidateQueries({ queryKey: getGetTasksQueryKey() }),
    });
  };

  const KANBAN_STATUSES = ["pending", "executing", "paused", "done", "cancelled"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)]">Tarefas</h1>
        <div className="flex gap-2 items-center">
          <div className="flex border border-[var(--surface-1)] rounded-lg overflow-hidden">
            <button
              onClick={() => setView("list")}
              className={`p-2 transition-colors ${view === "list" ? "bg-[#C9A84C] text-[var(--surface-0)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--surface-2)]"}`}
              title="Lista"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              onClick={() => setView("kanban")}
              className={`p-2 transition-colors ${view === "kanban" ? "bg-[#C9A84C] text-[var(--surface-0)]" : "text-[var(--text-muted)] hover:text-[var(--text-primary)] bg-[var(--surface-2)]"}`}
              title="Kanban"
            >
              <Columns className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 bg-[var(--surface-2)] border-[var(--surface-1)] text-[var(--text-primary)]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--surface-2)] border-[var(--surface-1)]">
            <SelectItem value="all">Todos os status</SelectItem>
            <SelectItem value="atrasadas">Atrasadas</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="executing">Executando</SelectItem>
            <SelectItem value="paused">Pausado</SelectItem>
            <SelectItem value="done">Concluido</SelectItem>
            <SelectItem value="cancelled">Cancelado</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterPriority} onValueChange={setFilterPriority}>
          <SelectTrigger className="w-44 bg-[var(--surface-2)] border-[var(--surface-1)] text-[var(--text-primary)]">
            <SelectValue placeholder="Prioridade" />
          </SelectTrigger>
          <SelectContent className="bg-[var(--surface-2)] border-[var(--surface-1)]">
            <SelectItem value="all">Todas prioridades</SelectItem>
            <SelectItem value="1">P1 — Urgente</SelectItem>
            <SelectItem value="2">P2 — Alta</SelectItem>
            <SelectItem value="3">P3 — Media</SelectItem>
            <SelectItem value="4">P4 — Sem prioridade</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="text-center py-20 text-[var(--text-subtle)]">Carregando...</div>
      ) : tasks?.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-[var(--text-subtle)]">Nenhuma tarefa. Adicione a primeira!</p>
        </div>
      ) : view === "list" ? (
        <div className="space-y-2">
          {tasks?.map((task) => {
            const overdue = isOverdue(task);
            return (
            <div
              key={task.id}
              data-testid={`task-row-${task.id}`}
              onClick={() => setSelectedTaskId(task.id)}
              className={`flex items-center gap-3 p-4 bg-[var(--surface-2)] rounded-xl border cursor-pointer transition-all group ${
                overdue ? "border-[#E53E3E]/40 hover:border-[#E53E3E]/70" : "border-[var(--surface-1)] hover:border-[#C9A84C]/40"
              }`}
            >
              <div
                className="w-1 self-stretch rounded-full shrink-0"
                style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
              />
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${task.status === "done" ? "line-through text-[var(--text-subtle)]" : "text-[var(--text-primary)]"}`}>
                  {task.title}
                </p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  {overdue && (
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 text-[#E53E3E] bg-[#E53E3E]/15">
                      <AlertTriangle className="h-3 w-3" /> Atrasada
                    </span>
                  )}
                  <span
                    className="text-xs font-semibold px-2 py-0.5 rounded-full"
                    style={{
                      color: STATUS_COLORS[task.status],
                      backgroundColor: STATUS_COLORS[task.status] + "22",
                    }}
                  >
                    {STATUS_LABELS[task.status]}
                  </span>
                  {task.sector && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{ color: task.sector.color, backgroundColor: task.sector.color + "22" }}
                    >
                      {task.sector.label}
                    </span>
                  )}
                  {task.dueDate && isValid(new Date(task.dueDate)) && (
                    <span className={`text-xs ${overdue ? "text-[#E53E3E] font-semibold" : "text-[var(--text-subtle)]"}`}>
                      {format(new Date(task.dueDate), "d MMM", { locale: ptBR })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {task.status === "pending" && (
                  <button
                    data-testid={`btn-execute-${task.id}`}
                    onClick={(e) => handleExecute(task.id, e)}
                    className="p-2 rounded-lg text-[#C9A84C] hover:bg-[#C9A84C] hover:text-[var(--surface-0)] transition-colors"
                    title="Executar"
                  >
                    <Play className="h-4 w-4" fill="currentColor" />
                  </button>
                )}
                {task.status !== "done" && task.status !== "cancelled" && (
                  <button
                    data-testid={`btn-complete-${task.id}`}
                    onClick={(e) => handleComplete(task.id, e)}
                    className="p-2 rounded-lg text-[#38A169] hover:bg-[#38A169] hover:text-white transition-colors"
                    title="Concluir"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                <button
                  data-testid={`btn-delete-${task.id}`}
                  onClick={(e) => handleDelete(task.id, e)}
                  className="p-2 rounded-lg text-[#E53E3E] hover:bg-[#E53E3E] hover:text-white transition-colors"
                  title="Cancelar"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
            );
          })}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {KANBAN_STATUSES.map((status) => {
            const columnTasks = tasks?.filter((t) => t.status === status) ?? [];
            return (
              <div key={status} className="flex-none w-64">
                <div className="flex items-center gap-2 mb-3">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[status] }}
                  />
                  <h3 className="text-sm font-semibold text-[var(--text-muted)]">
                    {STATUS_LABELS[status]}
                  </h3>
                  <span className="ml-auto text-xs text-[var(--text-subtle)] bg-[var(--surface-1)] px-1.5 py-0.5 rounded">
                    {columnTasks.length}
                  </span>
                </div>
                <div className="space-y-2 min-h-[100px]">
                  {columnTasks.map((task) => (
                    <div
                      key={task.id}
                      data-testid={`kanban-card-${task.id}`}
                      onClick={() => setSelectedTaskId(task.id)}
                      className="p-3 bg-[var(--surface-2)] rounded-lg border border-[var(--surface-1)] hover:border-[#C9A84C]/40 cursor-pointer transition-all"
                    >
                      <div className="flex items-start gap-2 mb-2">
                        <span
                          className="w-1 h-4 rounded-full mt-0.5 shrink-0"
                          style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                        />
                        <p className="text-sm text-[var(--text-primary)] leading-snug">{task.title}</p>
                      </div>
                      {task.sector && (
                        <span
                          className="text-xs px-1.5 py-0.5 rounded-full inline-block"
                          style={{ color: task.sector.color, backgroundColor: task.sector.color + "22" }}
                        >
                          {task.sector.label}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedTaskId && (
        <TaskDetail
          taskId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
        />
      )}
    </div>
  );
}
