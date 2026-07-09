import { useGetWeeklyStats, useGetTasks, useGetGoals, useExecuteTask, getGetTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckSquare, Clock, Target, TrendingUp, Play } from "lucide-react";
import { useTimerStore } from "@/store/timerStore";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";

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

export default function Dashboard() {
  const qc = useQueryClient();
  const { data: stats, isLoading: statsLoading } = useGetWeeklyStats();
  const { data: tasks } = useGetTasks({ status: "pending" });
  const { data: goals } = useGetGoals();
  const executeTask = useExecuteTask();
  const { setActive } = useTimerStore();

  const todayTasks = tasks?.filter((t) => t.dueDate && isToday(new Date(t.dueDate))) ?? [];
  const atRiskGoals = goals?.filter((g) => g.isAtRisk) ?? [];

  const handleExecute = (taskId: string) => {
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

  const statCards = [
    {
      label: "Total de tarefas",
      value: stats?.total ?? 0,
      icon: <TrendingUp className="h-5 w-5" />,
      color: "#C9A84C",
    },
    {
      label: "Concluídas esta semana",
      value: stats?.done ?? 0,
      icon: <CheckSquare className="h-5 w-5" />,
      color: "#38A169",
    },
    {
      label: "Pendentes",
      value: stats?.pending ?? 0,
      icon: <Target className="h-5 w-5" />,
      color: "#3B82F6",
    },
    {
      label: "Horas registradas",
      value: `${stats?.totalHours ?? 0}h`,
      icon: <Clock className="h-5 w-5" />,
      color: "#E2C06E",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#F0EBE3] mb-1">
          Visão Geral
        </h1>
        <p className="text-[#A89880] text-sm">
          {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-[#1A2B42] rounded-xl p-5 border border-[#162236] hover:border-[#C9A84C]/30 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <span style={{ color: card.color }}>{card.icon}</span>
            </div>
            <p
              className="text-3xl font-bold font-mono"
              style={{ color: card.color }}
            >
              {statsLoading ? "—" : card.value}
            </p>
            <p className="text-xs text-[#6B7A8D] mt-1 font-medium">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* Weekly bar chart */}
      {stats?.byDay && stats.byDay.length > 0 && (
        <div className="bg-[#1A2B42] rounded-xl p-6 border border-[#162236]">
          <h2 className="text-sm font-semibold text-[#A89880] uppercase tracking-widest mb-4">
            Conclusões por dia
          </h2>
          <div className="flex items-end gap-2 h-24">
            {stats.byDay.map((day) => {
              const maxCount = Math.max(...stats.byDay.map((d) => d.count), 1);
              const height = (day.count / maxCount) * 100;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-[#6B7A8D]">{day.count || ""}</span>
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max(height, 4)}%`,
                      backgroundColor: day.count > 0 ? "#C9A84C" : "#162236",
                      minHeight: "4px",
                    }}
                  />
                  <span className="text-xs text-[#6B7A8D]">
                    {format(new Date(day.date + "T12:00:00"), "EEE", { locale: ptBR })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's tasks */}
        <div className="bg-[#1A2B42] rounded-xl p-6 border border-[#162236]">
          <h2 className="text-sm font-semibold text-[#A89880] uppercase tracking-widest mb-4">
            Tarefas para hoje
          </h2>
          {todayTasks.length === 0 ? (
            <p className="text-[#6B7A8D] text-sm text-center py-6">
              Nenhuma tarefa para hoje.
            </p>
          ) : (
            <div className="space-y-2">
              {todayTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  data-testid={`task-today-${task.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-[#162236] hover:bg-[#0D1B2A] transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-xs font-bold"
                        style={{ color: PRIORITY_COLORS[task.priority] }}
                      >
                        P{task.priority}
                      </span>
                      <p className="text-sm text-[#F0EBE3] truncate">{task.title}</p>
                    </div>
                  </div>
                  <button
                    data-testid={`btn-execute-${task.id}`}
                    onClick={() => handleExecute(task.id)}
                    disabled={executeTask.isPending}
                    className="ml-2 flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-[#C9A84C] hover:bg-[#C9A84C] hover:text-[#0D1B2A] transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Play className="h-3 w-3" fill="currentColor" />
                    Executar
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* At-risk goals */}
        <div className="bg-[#1A2B42] rounded-xl p-6 border border-[#162236]">
          <h2 className="text-sm font-semibold text-[#A89880] uppercase tracking-widest mb-4">
            Metas em risco
          </h2>
          {goals?.length === 0 ? (
            <p className="text-[#6B7A8D] text-sm text-center py-6">
              Nenhuma meta cadastrada.
            </p>
          ) : atRiskGoals.length === 0 ? (
            <p className="text-[#38A169] text-sm text-center py-6 font-medium">
              Todas as metas estao no prazo.
            </p>
          ) : (
            <div className="space-y-3">
              {atRiskGoals.map((goal) => (
                <div key={goal.id} className="p-3 rounded-lg bg-[#162236] border border-[#E53E3E]/30">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm text-[#F0EBE3] font-medium">{goal.title}</p>
                    <span className="text-xs text-[#E53E3E] font-bold ml-2 shrink-0">
                      {Math.round(goal.progressPercent ?? 0)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[#0D1B2A] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#E53E3E]"
                      style={{ width: `${goal.progressPercent ?? 0}%` }}
                    />
                  </div>
                  {goal.deadline && (
                    <p className="text-xs text-[#E53E3E] mt-1">
                      Prazo: {format(new Date(goal.deadline), "d MMM", { locale: ptBR })}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
