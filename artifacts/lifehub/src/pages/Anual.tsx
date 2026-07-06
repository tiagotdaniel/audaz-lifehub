import { useGetAnnualStats } from "@workspace/api-client-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const getColor = (count: number) => {
  if (count === 0) return "#162236";
  if (count === 1) return "#C9A84C44";
  if (count === 2) return "#C9A84C88";
  if (count === 3) return "#C9A84CBB";
  return "#C9A84C";
};

export default function Anual() {
  const { data, isLoading } = useGetAnnualStats();

  const heatmap = data?.heatmap ?? [];

  const maxCount = Math.max(...heatmap.map((d) => d.count), 1);

  const weeks: Array<Array<(typeof heatmap)[0] | null>> = [];
  if (heatmap.length > 0) {
    const firstDay = parseISO(heatmap[0].date);
    const firstDayOfWeek = firstDay.getDay();
    let week: Array<(typeof heatmap)[0] | null> = Array(firstDayOfWeek).fill(null);
    for (const day of heatmap) {
      week.push(day);
      if (week.length === 7) {
        weeks.push(week);
        week = [];
      }
    }
    if (week.length > 0) {
      while (week.length < 7) week.push(null);
      weeks.push(week);
    }
  }

  const months: string[] = [];
  let lastMonth = "";
  for (const week of weeks) {
    const firstDay = week.find((d) => d !== null);
    if (firstDay) {
      const month = format(parseISO(firstDay.date), "MMM", { locale: ptBR });
      months.push(month !== lastMonth ? month : "");
      lastMonth = month;
    } else {
      months.push("");
    }
  }

  const totalDone = heatmap.reduce((acc, d) => acc + d.count, 0);
  const activeDays = heatmap.filter((d) => d.count > 0).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[#F0EBE3] mb-1">Visao Anual</h1>
        <p className="text-[#A89880] text-sm">Historico de tarefas concluidas nos ultimos 365 dias</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[#1A2B42] rounded-xl p-5 border border-[#162236]">
          <p className="text-3xl font-bold text-[#C9A84C] font-mono">{totalDone}</p>
          <p className="text-xs text-[#6B7A8D] mt-1">Tarefas concluidas</p>
        </div>
        <div className="bg-[#1A2B42] rounded-xl p-5 border border-[#162236]">
          <p className="text-3xl font-bold text-[#C9A84C] font-mono">{activeDays}</p>
          <p className="text-xs text-[#6B7A8D] mt-1">Dias ativos</p>
        </div>
        <div className="bg-[#1A2B42] rounded-xl p-5 border border-[#162236]">
          <p className="text-3xl font-bold text-[#C9A84C] font-mono">
            {heatmap.length > 0 ? Math.round((activeDays / heatmap.length) * 100) : 0}%
          </p>
          <p className="text-xs text-[#6B7A8D] mt-1">Taxa de consistencia</p>
        </div>
        <div className="bg-[#1A2B42] rounded-xl p-5 border border-[#162236]">
          <p className="text-3xl font-bold text-[#C9A84C] font-mono">
            {activeDays > 0 ? Math.round(totalDone / activeDays * 10) / 10 : 0}
          </p>
          <p className="text-xs text-[#6B7A8D] mt-1">Media por dia ativo</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-[#6B7A8D]">Carregando...</div>
      ) : (
        <div className="bg-[#1A2B42] rounded-xl p-6 border border-[#162236] overflow-x-auto">
          <h2 className="text-sm font-semibold text-[#A89880] uppercase tracking-widest mb-4">Mapa de Calor</h2>

          {/* Month labels */}
          <div className="flex gap-1 mb-1 ml-5">
            {months.map((month, i) => (
              <div key={i} className="w-3 shrink-0 text-center">
                <span className="text-xs text-[#6B7A8D]" style={{ fontSize: "9px" }}>{month}</span>
              </div>
            ))}
          </div>

          <div className="flex gap-1">
            {/* Day labels */}
            <div className="flex flex-col gap-1 mr-1">
              {["D", "S", "T", "Q", "Q", "S", "S"].map((d, i) => (
                <div key={i} className="h-3 w-3 flex items-center justify-center">
                  <span className="text-[#6B7A8D]" style={{ fontSize: "9px" }}>{i % 2 === 1 ? d : ""}</span>
                </div>
              ))}
            </div>

            {/* Heatmap grid */}
            <div className="flex gap-1">
              {weeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((day, di) =>
                    day ? (
                      <div
                        key={day.date}
                        className="w-3 h-3 rounded-sm transition-colors cursor-default"
                        style={{ backgroundColor: getColor(day.count) }}
                        title={`${format(parseISO(day.date), "d MMM yyyy", { locale: ptBR })}: ${day.count} tarefa${day.count !== 1 ? "s" : ""}`}
                      />
                    ) : (
                      <div key={di} className="w-3 h-3" />
                    )
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-2 mt-4 justify-end">
            <span className="text-xs text-[#6B7A8D]">Menos</span>
            {[0, 1, 2, 3, 4].map((count) => (
              <div key={count} className="w-3 h-3 rounded-sm" style={{ backgroundColor: getColor(count) }} />
            ))}
            <span className="text-xs text-[#6B7A8D]">Mais</span>
          </div>
        </div>
      )}
    </div>
  );
}
