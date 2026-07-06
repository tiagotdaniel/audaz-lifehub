import { useState, useEffect, useRef } from "react";
import { useGetSectors, useCreateTask, getGetTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { parsePortugueseDate, extractTitle, extractPriority, parseTimeExpression } from "@/lib/dateParser";
import { format, addDays, nextSaturday, nextMonday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flag, X, Send, CalendarClock, Hash, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface QuickAddModalProps {
  open: boolean;
  onClose: () => void;
}

const PRIORITIES = [
  { value: 1, label: "P1 — Urgente", color: "#E53E3E" },
  { value: 2, label: "P2 — Alta", color: "#ED8936" },
  { value: 3, label: "P3 — Média", color: "#3B82F6" },
  { value: 4, label: "P4 — Baixa", color: "#6B7280" },
];

const SNOOZE_OPTIONS = [
  { label: "Amanhã", getValue: () => addDays(new Date(), 1) },
  { label: "+2 dias", getValue: () => addDays(new Date(), 2) },
  { label: "Fim de semana", getValue: () => nextSaturday(new Date()) },
  { label: "Próxima semana", getValue: () => nextMonday(new Date()) },
];

export default function QuickAddModal({ open, onClose }: QuickAddModalProps) {
  const [text, setText] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState(4);
  const [sectorId, setSectorId] = useState<string | null>(null);
  const [parsedDate, setParsedDate] = useState<Date | null>(null);
  const [parsedTime, setParsedTime] = useState<{ hours: number; minutes: number } | null>(null);
  const [showHashDropdown, setShowHashDropdown] = useState(false);
  const [hashQuery, setHashQuery] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const qc = useQueryClient();
  const { data: sectors } = useGetSectors();
  const createTask = useCreateTask();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setText("");
      setDescription("");
      setPriority(4);
      setSectorId(null);
      setParsedDate(null);
      setParsedTime(null);
      setShowHashDropdown(false);
    }
  }, [open]);

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
          description: description || undefined,
          priority,
          dueDate: dueDate ? dueDate.toISOString() : undefined,
          sectorId: sectorId ?? undefined,
        },
      },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
          onClose();
        },
      }
    );
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && e.currentTarget === inputRef.current) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const selectSectorFromHash = (sid: string) => {
    setSectorId(sid);
    const hashIdx = text.lastIndexOf("#");
    setText(text.slice(0, hashIdx).trim());
    setShowHashDropdown(false);
    inputRef.current?.focus();
  };

  const applySnooze = (getValue: () => Date) => {
    const d = getValue();
    if (parsedTime) d.setHours(parsedTime.hours, parsedTime.minutes, 0, 0);
    setParsedDate(d);
  };

  const filteredSectors = sectors?.filter(s =>
    !hashQuery || s.label.toLowerCase().includes(hashQuery)
  );

  const selectedSector = sectors?.find(s => s.id === sectorId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#162236] border-[#1A2B42] text-[#F0EBE3] sm:max-w-[560px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[#1A2B42]">
          <DialogTitle className="text-[#F0EBE3] font-serif text-xl flex items-center justify-between">
            Nova Tarefa
            <button onClick={onClose} className="text-[#6B7A8D] hover:text-[#F0EBE3] transition-colors">
              <X className="h-4 w-4" />
            </button>
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 py-4 space-y-4">
          {/* Título com hash dropdown */}
          <div className="relative">
            <Input
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Título da tarefa... (use #setor, P1-P4, amanhã às 21h)"
              className="bg-[#1A2B42] border-[#1A2B42] text-[#F0EBE3] placeholder:text-[#6B7A8D] focus-visible:ring-[#C9A84C] focus-visible:border-[#C9A84C] h-11 text-base"
            />
            {showHashDropdown && filteredSectors && filteredSectors.length > 0 && (
              <div className="absolute top-full mt-1 left-0 z-50 bg-[#0D1B2A] border border-[#1A2B42] rounded-lg shadow-xl overflow-hidden min-w-[180px]">
                {filteredSectors.map(s => (
                  <button
                    key={s.id}
                    onMouseDown={(e) => { e.preventDefault(); selectSectorFromHash(s.id); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#F0EBE3] hover:bg-[#1A2B42] transition-colors text-left"
                  >
                    <Hash className="h-3 w-3" style={{ color: s.color }} />
                    {s.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Preview de data/hora detectada */}
          {(parsedDate || parsedTime) && (
            <div className="flex items-center gap-2 text-xs text-[#C9A84C]">
              <CalendarClock className="h-3.5 w-3.5" />
              {parsedDate ? format(parsedDate, "EEEE, d 'de' MMMM", { locale: ptBR }) : ""}
              {parsedTime ? ` às ${String(parsedTime.hours).padStart(2,"0")}:${String(parsedTime.minutes).padStart(2,"0")}` : ""}
            </div>
          )}

          {/* Descrição */}
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Descrição (opcional)"
            className="bg-[#1A2B42] border-[#1A2B42] text-[#F0EBE3] placeholder:text-[#6B7A8D] focus-visible:ring-[#C9A84C] resize-none h-20"
          />

          {/* Prioridade */}
          <div className="space-y-2">
            <label className="text-xs text-[#6B7A8D] uppercase tracking-widest flex items-center gap-1">
              <Flag className="h-3 w-3" />
              Prioridade
            </label>
            <div className="flex gap-2">
              {PRIORITIES.map((p) => (
                <button
                  key={p.value}
                  onClick={() => setPriority(p.value)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                    priority === p.value
                      ? "border-opacity-100 text-white"
                      : "border-[#1A2B42] text-[#6B7A8D] hover:border-opacity-60"
                  }`}
                  style={{
                    borderColor: p.color,
                    backgroundColor: priority === p.value ? p.color + "33" : "transparent",
                    color: priority === p.value ? p.color : undefined,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Setor */}
          <div className="space-y-2">
            <label className="text-xs text-[#6B7A8D] uppercase tracking-widest flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Setor
            </label>
            <div className="flex flex-wrap gap-2">
              {sectors?.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSectorId(sectorId === s.id ? null : s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    sectorId === s.id ? "text-[#0D1B2A] font-bold" : "text-[#A89880]"
                  }`}
                  style={{
                    borderColor: s.color,
                    backgroundColor: sectorId === s.id ? s.color : "transparent",
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {/* Adiar */}
          <div className="space-y-2">
            <label className="text-xs text-[#6B7A8D] uppercase tracking-widest flex items-center gap-1">
              <SkipForward className="h-3 w-3" />
              Adiar para
            </label>
            <div className="flex gap-2 flex-wrap">
              {SNOOZE_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => applySnooze(opt.getValue)}
                  className={`px-3 py-1.5 rounded-lg text-xs border transition-all ${
                    parsedDate && format(parsedDate, "yyyy-MM-dd") === format(opt.getValue(), "yyyy-MM-dd")
                      ? "border-[#C9A84C] text-[#C9A84C] bg-[#C9A84C]/10"
                      : "border-[#1A2B42] text-[#A89880] hover:border-[#C9A84C] hover:text-[#C9A84C]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[#1A2B42] border-t border-[#1A2B42] flex items-center justify-between gap-3">
          <div className="text-xs text-[#6B7A8D]">
            {selectedSector && (
              <span className="px-2 py-0.5 rounded-full text-xs" style={{ color: selectedSector.color, backgroundColor: selectedSector.color + "22" }}>
                #{selectedSector.label}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={onClose}
              className="text-[#A89880] hover:text-[#F0EBE3] hover:bg-[#162236]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!text.trim() || createTask.isPending}
              className="bg-[#C9A84C] hover:bg-[#E2C06E] text-[#0D1B2A] font-bold"
            >
              <Send className="h-4 w-4 mr-2" />
              {createTask.isPending ? "Salvando..." : "Adicionar Tarefa"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
