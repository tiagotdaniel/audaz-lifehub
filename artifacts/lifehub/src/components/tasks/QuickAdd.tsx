import { useState, useEffect, useRef, useCallback } from "react";
import { useGetSectors, useCreateTask, getGetTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { parsePortugueseDate, extractTitle, extractPriority, parseTimeExpression } from "@/lib/dateParser";
import { format, addDays, nextSaturday, nextMonday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flag, Send, CalendarClock, Hash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRIORITIES = [
  { value: 1, label: "P1", color: "#E53E3E" },
  { value: 2, label: "P2", color: "#ED8936" },
  { value: 3, label: "P3", color: "#3B82F6" },
  { value: 4, label: "P4", color: "#6B7280" },
];

const SNOOZE_OPTIONS = [
  { label: "Amanhã", getValue: () => addDays(new Date(), 1) },
  { label: "Mais tarde (+2d)", getValue: () => addDays(new Date(), 2) },
  { label: "Final de semana", getValue: () => nextSaturday(new Date()) },
  { label: "Próxima semana", getValue: () => nextMonday(new Date()) },
];

interface QuickAddProps {
  defaultSectorId?: string;
}

export default function QuickAdd({ defaultSectorId }: QuickAddProps) {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState(4);
  const [sectorId, setSectorId] = useState<string | null>(defaultSectorId ?? null);
  const [parsedDate, setParsedDate] = useState<Date | null>(null);
  const [parsedTime, setParsedTime] = useState<{ hours: number; minutes: number } | null>(null);
  const [showHashDropdown, setShowHashDropdown] = useState(false);
  const [hashQuery, setHashQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const qc = useQueryClient();
  const { data: sectors } = useGetSectors();
  const createTask = useCreateTask();

  useEffect(() => {
    if (text.trim()) {
      const priorityResult = extractPriority(text);
      const cleanText = priorityResult ? priorityResult.cleaned : text;
      if (priorityResult) setPriority(priorityResult.priority);
      setParsedDate(parsePortugueseDate(cleanText));
      setParsedTime(parseTimeExpression(cleanText));
    } else {
      setParsedDate(null);
      setParsedTime(null);
    }

    const hashIdx = text.lastIndexOf("#");
    if (hashIdx !== -1 && text.slice(hashIdx + 1).match(/^\w*$/)) {
      setShowHashDropdown(true);
      setHashQuery(text.slice(hashIdx + 1).toLowerCase());
    } else {
      setShowHashDropdown(false);
      setHashQuery("");
    }
  }, [text]);

  const focusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "n") {
        e.preventDefault();
        focusInput();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [focusInput]);

  const getCleanTitle = () => {
    const priorityResult = extractPriority(text);
    const withoutPriority = priorityResult ? priorityResult.cleaned : text;
    return extractTitle(withoutPriority, parsedDate) || withoutPriority.trim();
  };

  const handleSubmit = () => {
    const title = getCleanTitle();
    if (!title) return;

    let dueDate = parsedDate;
    if (parsedDate && parsedTime) {
      dueDate = new Date(parsedDate);
      dueDate.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
    }

    createTask.mutate(
      {
        data: {
          title,
          priority,
          dueDate: dueDate ? dueDate.toISOString() : undefined,
          sectorId: sectorId ?? undefined,
        },
      },
      {
        onSuccess: () => {
          setText("");
          setPriority(4);
          setSectorId(defaultSectorId ?? null);
          setParsedDate(null);
          setParsedTime(null);
          qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape") {
      setShowHashDropdown(false);
    }
  };

  const selectSectorFromHash = (sid: string, label: string) => {
    setSectorId(sid);
    const hashIdx = text.lastIndexOf("#");
    setText(text.slice(0, hashIdx).trim());
    setShowHashDropdown(false);
    inputRef.current?.focus();
    void label;
  };

  const applySnooze = (getValue: () => Date) => {
    const d = getValue();
    if (parsedTime) {
      d.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
    }
    setParsedDate(d);
  };

  const filteredSectors = sectors?.filter(s =>
    !hashQuery || s.label.toLowerCase().includes(hashQuery)
  );

  return (
    <div className="space-y-2 relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Input
            ref={inputRef}
            data-testid="input-quickadd"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Adicionar tarefa... (use #setor, P1-P4)"
            className="w-full bg-[#162236] border-[#1A2B42] text-[#F0EBE3] placeholder:text-[#6B7A8D] focus-visible:ring-[#C9A84C] focus-visible:border-[#C9A84C] h-10"
          />
          {showHashDropdown && filteredSectors && filteredSectors.length > 0 && (
            <div className="absolute top-full mt-1 left-0 z-50 bg-[#162236] border border-[#1A2B42] rounded-lg shadow-xl overflow-hidden min-w-[180px]">
              {filteredSectors.map(s => (
                <button
                  key={s.id}
                  onMouseDown={(e) => { e.preventDefault(); selectSectorFromHash(s.id, s.label); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#F0EBE3] hover:bg-[#1A2B42] transition-colors text-left"
                >
                  <Hash className="h-3 w-3" style={{ color: s.color }} />
                  {s.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          {PRIORITIES.map((p) => (
            <button
              key={p.value}
              data-testid={`btn-priority-${p.value}`}
              onClick={() => setPriority(p.value)}
              title={`Prioridade ${p.label}`}
              className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-bold transition-all ${
                priority === p.value
                  ? "ring-2 ring-offset-1 ring-offset-[#0D1B2A] scale-105"
                  : "opacity-50 hover:opacity-80"
              }`}
              style={{ color: p.color }}
            >
              <Flag className="h-3 w-3" style={{ fill: priority === p.value ? p.color : "transparent" }} />
              {p.label}
            </button>
          ))}
        </div>
        <Button
          data-testid="btn-submit-quickadd"
          onClick={handleSubmit}
          disabled={!text.trim() || createTask.isPending}
          size="sm"
          className="bg-[#C9A84C] hover:bg-[#E2C06E] text-[#0D1B2A] font-bold px-3 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {sectors?.map((s) => (
          <button
            key={s.id}
            data-testid={`chip-sector-${s.id}`}
            onClick={() => setSectorId(sectorId === s.id ? null : s.id)}
            className={`px-2 py-0.5 rounded-full text-xs font-medium border transition-all ${
              sectorId === s.id
                ? "opacity-100 text-[#0D1B2A] font-bold"
                : "opacity-60 hover:opacity-90 text-[#F0EBE3] bg-transparent"
            }`}
            style={{
              borderColor: s.color,
              backgroundColor: sectorId === s.id ? s.color : "transparent",
            }}
          >
            {s.label}
          </button>
        ))}
        {parsedDate && (
          <span className="text-xs text-[#C9A84C] flex items-center gap-1 ml-auto font-medium">
            <CalendarClock className="h-3 w-3" />
            {format(parsedDate, "d MMM, HH:mm", { locale: ptBR })}
          </span>
        )}
      </div>

      {parsedDate && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-[#6B7A8D]">Adiar para:</span>
          {SNOOZE_OPTIONS.map(opt => (
            <button
              key={opt.label}
              onClick={() => applySnooze(opt.getValue)}
              className="px-2 py-0.5 rounded text-xs bg-[#1A2B42] text-[#A89880] hover:text-[#C9A84C] hover:bg-[#162236] transition-colors"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
