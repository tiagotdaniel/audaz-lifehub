import { useGetWeeklyStats, useGetProductivityStats, useGetTasks, useGetGoals, useExecuteTask, getGetTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { CheckSquare, Clock, Target, TrendingUp, Play, Flame, TimerReset, AlarmClockOff, Gauge } from "lucide-react";
import { useTimerStore } from "@/store/timerStore";
import { useEffect, useState } from "react";
import { format, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Link } from "wouter";

function useStreak() {
  const { getToken } = useAuth();
  const [streakDays, setStreakDays] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const res = await fetch("/api/streak", { headers: { Authorization: `Bearer ${token}` } });
      if (res.ok) {
        const data = await res.json();
        setStreakDays(data.streakDays ?? 0);
      }
    })();
  }, [getToken]);

  return streakDays;
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

export default function Dashboard() {
  const qc = useQueryClient();
  const { data: stats, isLoading: statsLoading } = useGetWeeklyStats();
  const { data: productivity } = useGetProductivityStats();
  const { data: tasks } = useGetTasks({ status: "pending" });
  const { data: goals } = useGetGoals();
  const executeTask = useExecuteTask();
  const { setActive } = useTimerStore();
  const streakDays = useStreak();

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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)] mb-1">
            Visão Geral
          </h1>
          <p className="text-[var(--text-muted)] text-sm">
            {format(new Date(), "EEEE, d 'de' MMMM", { locale: ptBR })}
          </p>
        </div>
        {streakDays !== null && streakDays > 0 && (
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--surface-2)] border border-[#C9A84C]/30"
            title="Dias seguidos acessando o app"
          >
            <Flame className="h-4 w-4 text-[#ED8936]" fill="#ED8936" />
            <span className="text-sm font-bold text-[var(--text-primary)]">{streakDays}</span>
            <span className="text-xs text-[var(--text-muted)]">dia{streakDays !== 1 ? "s" : ""} ativo{streakDays !== 1 ? "s" : ""}</span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-[var(--surface-2)] rounded-xl p-5 border border-[var(--surface-1)] hover:border-[#C9A84C]/30 transition-colors"
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
            <p className="text-xs text-[var(--text-subtle)] mt-1 font-medium">
              {card.label}
            </p>
          </div>
        ))}
      </div>

      {/* Weekly bar chart */}
      {stats?.byDay && stats.byDay.length > 0 && (
        <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)]">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4">
            Conclusões por dia
          </h2>
          <div className="flex items-end gap-2 h-24">
            {stats.byDay.map((day) => {
              const maxCount = Math.max(...stats.byDay.map((d) => d.count), 1);
              const height = (day.count / maxCount) * 100;
              return (
                <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-xs text-[var(--text-subtle)]">{day.count || ""}</span>
                  <div
                    className="w-full rounded-t-sm transition-all"
                    style={{
                      height: `${Math.max(height, 4)}%`,
                      backgroundColor: day.count > 0 ? "#C9A84C" : "#162236",
                      minHeight: "4px",
                    }}
                  />
                  <span className="text-xs text-[var(--text-subtle)]">
                    {format(new Date(day.date + "T12:00:00"), "EEE", { locale: ptBR })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Productivity: time per task + saved/lost */}
      {productivity && (productivity.byTask.length > 0 || productivity.savedMinutes > 0 || productivity.lostMinutes > 0) && (
        <div className="grid md:grid-cols-3 gap-6">
          <div className="md:col-span-2 bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)]">
            <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4">
              Tempo por tarefa
            </h2>
            {productivity.byTask.length === 0 ? (
              <p className="text-[var(--text-subtle)] text-sm text-center py-10">Nenhum tempo registrado ainda.</p>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={productivity.byTask} layout="vertical" margin={{ left: 8, right: 16 }}>
                  <XAxis type="number" hide />
                  <YAxis
                    type="category"
                    dataKey="title"
                    width={140}
                    tick={{ fill: "#A89880", fontSize: 12 }}
                    tickFormatter={(v: string) => (v.length > 18 ? v.slice(0, 18) + "…" : v)}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: "#162236", border: "1px solid #1A2B42", borderRadius: 8, color: "#F0EBE3" }}
                    formatter={(v: number) => [`${v} min`, "Tempo"]}
                  />
                  <Bar dataKey="minutes" radius={[0, 4, 4, 0]}>
                    {productivity.byTask.map((_, i) => (
                      <Cell key={i} fill="#C9A84C" fillOpacity={1 - i * 0.08} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="space-y-4">
            <div className="bg-[var(--surface-2)] rounded-xl p-5 border border-[#38A169]/30">
              <div className="flex items-center gap-2 mb-2 text-[#38A169]"><TimerReset className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-wider">Tempo economizado</span></div>
              <p className="text-2xl font-bold font-mono text-[#38A169]">{productivity.savedMinutes} min</p>
              <p className="text-xs text-[var(--text-subtle)] mt-1">vs. estimativa das tarefas concluídas</p>
            </div>
            <div className="bg-[var(--surface-2)] rounded-xl p-5 border border-[#E53E3E]/30">
              <div className="flex items-center gap-2 mb-2 text-[#E53E3E]"><AlarmClockOff className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-wider">Tempo perdido</span></div>
              <p className="text-2xl font-bold font-mono text-[#E53E3E]">{productivity.lostMinutes} min</p>
              <p className="text-xs text-[var(--text-subtle)] mt-1">vs. estimativa das tarefas concluídas</p>
            </div>
            {productivity.estimatedTotalSavedMinutes != null ? (
              <div className="bg-[var(--surface-2)] rounded-xl p-5 border border-[#C9A84C]/30">
                <div className="flex items-center gap-2 mb-2 text-[#C9A84C]"><Gauge className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-wider">Tempo total estimado economizado</span></div>
                <p className="text-2xl font-bold font-mono text-[#C9A84C]">
                  {Math.round(productivity.estimatedTotalSavedMinutes / 60)}h
                </p>
                <p className="text-xs text-[var(--text-subtle)] mt-1">
                  em {productivity.daysSinceProfile} dias, com base no seu questionário de rotina
                </p>
              </div>
            ) : (
              <Link href="/configuracoes">
                <div className="bg-[var(--surface-2)] rounded-xl p-5 border border-[var(--surface-1)] hover:border-[#C9A84C]/40 transition-colors cursor-pointer">
                  <div className="flex items-center gap-2 mb-2 text-[var(--text-muted)]"><Gauge className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-wider">Tempo economizado</span></div>
                  <p className="text-sm text-[var(--text-subtle)]">Preencha o questionário de rotina em Configurações para ver sua estimativa.</p>
                </div>
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's tasks */}
        <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)]">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4">
            Tarefas para hoje
          </h2>
          {todayTasks.length === 0 ? (
            <p className="text-[var(--text-subtle)] text-sm text-center py-6">
              Nenhuma tarefa para hoje.
            </p>
          ) : (
            <div className="space-y-2">
              {todayTasks.slice(0, 5).map((task) => (
                <div
                  key={task.id}
                  data-testid={`task-today-${task.id}`}
                  className="flex items-center justify-between p-3 rounded-lg bg-[var(--surface-1)] hover:bg-[var(--surface-0)] transition-colors group"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span
                        className="text-xs font-bold"
                        style={{ color: PRIORITY_COLORS[task.priority] }}
                      >
                        P{task.priority}
                      </span>
                      <p className="text-sm text-[var(--text-primary)] truncate">{task.title}</p>
                    </div>
                  </div>
                  <button
                    data-testid={`btn-execute-${task.id}`}
                    onClick={() => handleExecute(task.id)}
                    disabled={executeTask.isPending}
                    className="ml-2 flex items-center gap-1 px-2 py-1 rounded text-xs font-semibold text-[#C9A84C] hover:bg-[#C9A84C] hover:text-[var(--surface-0)] transition-all opacity-0 group-hover:opacity-100"
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
        <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)]">
          <h2 className="text-sm font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4">
            Metas em risco
          </h2>
          {goals?.length === 0 ? (
            <p className="text-[var(--text-subtle)] text-sm text-center py-6">
              Nenhuma meta cadastrada.
            </p>
          ) : atRiskGoals.length === 0 ? (
            <p className="text-[#38A169] text-sm text-center py-6 font-medium">
              Todas as metas estao no prazo.
            </p>
          ) : (
            <div className="space-y-3">
              {atRiskGoals.map((goal) => (
                <div key={goal.id} className="p-3 rounded-lg bg-[var(--surface-1)] border border-[#E53E3E]/30">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm text-[var(--text-primary)] font-medium">{goal.title}</p>
                    <span className="text-xs text-[#E53E3E] font-bold ml-2 shrink-0">
                      {Math.round(goal.progressPercent ?? 0)}%
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--surface-0)] overflow-hidden">
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
