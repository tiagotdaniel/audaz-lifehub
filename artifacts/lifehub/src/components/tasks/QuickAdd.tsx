import { useState, useEffect, useRef, useCallback } from "react";
import { useGetSectors, useCreateTask, getGetTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { parsePortugueseDate, extractTitle } from "@/lib/dateParser";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flag, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const PRIORITIES = [
  { value: 1, label: "P1", color: "#E53E3E" },
  { value: 2, label: "P2", color: "#ED8936" },
  { value: 3, label: "P3", color: "#3B82F6" },
  { value: 4, label: "P4", color: "#6B7280" },
];

export default function QuickAdd() {
  const [text, setText] = useState("");
  const [priority, setPriority] = useState(4);
  const [sectorId, setSectorId] = useState<string | null>(null);
  const [parsedDate, setParsedDate] = useState<Date | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const qc = useQueryClient();
  const { data: sectors } = useGetSectors();
  const createTask = useCreateTask();

  useEffect(() => {
    if (text.trim()) {
      setParsedDate(parsePortugueseDate(text));
    } else {
      setParsedDate(null);
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

  const handleSubmit = () => {
    const title = extractTitle(text, parsedDate) || text.trim();
    if (!title) return;

    createTask.mutate(
      {
        data: {
          title,
          priority,
          dueDate: parsedDate ? parsedDate.toISOString() : undefined,
          sectorId: sectorId ?? undefined,
        },
      },
      {
        onSuccess: () => {
          setText("");
          setPriority(4);
          setSectorId(null);
          setParsedDate(null);
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
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          data-testid="input-quickadd"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Adicionar tarefa... (Ctrl+N)"
          className="flex-1 bg-[#162236] border-[#1A2B42] text-[#F0EBE3] placeholder:text-[#6B7A8D] focus-visible:ring-[#C9A84C] focus-visible:border-[#C9A84C] h-10"
        />
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
              style={{
                color: p.color,
                ringColor: p.color,
                borderColor: p.color,
              }}
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
          <span className="text-xs text-[#C9A84C] ml-auto font-medium">
            Data: {format(parsedDate, "d MMM, HH:mm", { locale: ptBR })}
          </span>
        )}
      </div>
    </div>
  );
}
