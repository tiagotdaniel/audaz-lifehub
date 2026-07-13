import { useGetTasks } from "@workspace/api-client-react";
import { format, startOfWeek, endOfWeek, addDays, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import TaskDetail from "@/components/tasks/TaskDetail";

const PRIORITY_COLORS: Record<number, string> = { 1: "#E53E3E", 2: "#ED8936", 3: "#3B82F6", 4: "#6B7280" };

export default function Planejamento() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const today = new Date();
  const weekStart = addDays(startOfWeek(today, { weekStartsOn: 1 }), weekOffset * 7);
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

  const { data: tasks } = useGetTasks({
    dateFrom: weekStart.toISOString(),
    dateTo: weekEnd.toISOString(),
  });

  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)]">Planejamento Semanal</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setWeekOffset(w => w - 1)} className="p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setWeekOffset(0)} className="px-3 py-1.5 rounded-lg bg-[var(--surface-2)] border border-[var(--surface-1)] text-xs text-[#C9A84C] font-semibold hover:bg-[var(--surface-1)] transition-colors">
            Hoje
          </button>
          <button onClick={() => setWeekOffset(w => w + 1)} className="p-2 rounded-lg bg-[var(--surface-2)] border border-[var(--surface-1)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <p className="text-[var(--text-muted)] text-sm">
        {format(weekStart, "d 'de' MMMM", { locale: ptBR })} — {format(weekEnd, "d 'de' MMMM yyyy", { locale: ptBR })}
      </p>

      <div className="grid grid-cols-7 gap-2">
        {weekDays.map((day) => {
          const dayTasks = tasks?.filter((t) => t.dueDate && isWithinInterval(new Date(t.dueDate), { start: new Date(day.toDateString()), end: addDays(new Date(day.toDateString()), 1) })) ?? [];
          const isToday = day.toDateString() === today.toDateString();

          return (
            <div key={day.toISOString()} className={`rounded-xl border p-3 min-h-[120px] ${isToday ? "border-[#C9A84C] bg-[var(--surface-2)]" : "border-[var(--surface-1)] bg-[var(--surface-2)]"}`}>
              <div className="mb-2">
                <p className={`text-xs font-bold uppercase ${isToday ? "text-[#C9A84C]" : "text-[var(--text-subtle)]"}`}>
                  {format(day, "EEE", { locale: ptBR })}
                </p>
                <p className={`text-lg font-bold ${isToday ? "text-[#C9A84C]" : "text-[var(--text-muted)]"}`}>
                  {format(day, "d")}
                </p>
              </div>
              <div className="space-y-1">
                {dayTasks.map((task) => (
                  <div
                    key={task.id}
                    onClick={() => setSelectedTaskId(task.id)}
                    className="px-1.5 py-1 rounded text-xs text-[var(--text-primary)] bg-[var(--surface-1)] hover:bg-[var(--surface-0)] cursor-pointer transition-colors border-l-2 truncate"
                    style={{ borderColor: PRIORITY_COLORS[task.priority] }}
                    title={task.title}
                  >
                    {task.title}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {selectedTaskId && <TaskDetail taskId={selectedTaskId} onClose={() => setSelectedTaskId(null)} />}
    </div>
  );
}
