import { useState, useEffect, useRef } from "react";
import { useGetSectors, useGetProjects, useGetGoals, useCreateTask, getGetTasksQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { parsePortugueseDate, extractTitle, extractPriority, parseTimeExpression } from "@/lib/dateParser";
import { fileToAttachment, type Attachment } from "@/lib/fileUpload";
import { format, addDays, nextSaturday, nextMonday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Flag, X, Send, CalendarClock, Hash, SkipForward, List, Paperclip, Upload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import TaskDescriptionEditor from "./TaskDescriptionEditor";
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

interface CheckList { id: string; name: string; color: string; }

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
  const [projectId, setProjectId] = useState<string | null>(null);
  const [goalId, setGoalId] = useState<string | null>(null);
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const [parsedDate, setParsedDate] = useState<Date | null>(null);
  const [parsedTime, setParsedTime] = useState<{ hours: number; minutes: number } | null>(null);
  const [showHashDropdown, setShowHashDropdown] = useState(false);
  const [hashQuery, setHashQuery] = useState("");
  const [showListDropdown, setShowListDropdown] = useState(false);
  const [listQuery, setListQuery] = useState("");
  const [targetList, setTargetList] = useState<CheckList | null>(null);
  const [lists, setLists] = useState<CheckList[]>([]);
  const [pendingAttachments, setPendingAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const qc = useQueryClient();
  const { getToken } = useAuth();
  const { data: sectors } = useGetSectors();
  const { data: projects } = useGetProjects();
  const { data: goals } = useGetGoals();
  const createTask = useCreateTask();

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      (async () => {
        const token = await getToken();
        const res = await fetch("/api/lists", { headers: { Authorization: `Bearer ${token}` } });
        if (res.ok) setLists(await res.json());
      })();
    } else {
      setText("");
      setDescription("");
      setPriority(4);
      setSectorId(null);
      setProjectId(null);
      setGoalId(null);
      setEstimatedMinutes("");
      setParsedDate(null);
      setParsedTime(null);
      setShowHashDropdown(false);
      setTargetList(null);
      setPendingAttachments([]);
      setUploadError("");
    }
  }, [open, getToken]);

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
      const isDouble = hashIdx > 0 && text[hashIdx - 1] === "#";
      if (isDouble) {
        setShowListDropdown(true);
        setListQuery(text.slice(hashIdx + 1).toLowerCase());
        setShowHashDropdown(false);
      } else {
        setShowHashDropdown(true);
        setHashQuery(text.slice(hashIdx + 1).toLowerCase());
        setShowListDropdown(false);
      }
    } else {
      setShowHashDropdown(false);
      setHashQuery("");
      setShowListDropdown(false);
      setListQuery("");
    }
  }, [text]);

  const getCleanTitle = () => {
    const priorityResult = extractPriority(text);
    const withoutPriority = priorityResult ? priorityResult.cleaned : text;
    return extractTitle(withoutPriority, parsedDate) || withoutPriority.trim();
  };

  const attachPendingFiles = async (taskId: string) => {
    if (!pendingAttachments.length) return;
    const token = await getToken();
    await Promise.all(
      pendingAttachments.map((att) =>
        fetch(`/api/attachments/tasks/${taskId}`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(att),
        })
      )
    );
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setUploadError("");
    try {
      const attachments = await Promise.all(Array.from(files).map(fileToAttachment));
      setPendingAttachments((prev) => [...prev, ...attachments]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Não foi possível anexar o arquivo.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removePendingAttachment = (idx: number) => {
    setPendingAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    const title = getCleanTitle();
    if (!title) return;

    if (targetList) {
      const token = await getToken();
      await fetch(`/api/lists/${targetList.id}/items`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title }),
      });
      onClose();
      return;
    }

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
          projectId: projectId ?? undefined,
          goalId: goalId ?? undefined,
          estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : undefined,
        },
      },
      {
        onSuccess: async (created) => {
          await attachPendingFiles(created.id);
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

  const selectListFromHash = (list: CheckList) => {
    setTargetList(list);
    const hashIdx = text.lastIndexOf("#");
    setText(text.slice(0, hashIdx - 1).trim());
    setShowListDropdown(false);
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

  const filteredLists = lists.filter(l =>
    !listQuery || l.name.toLowerCase().includes(listQuery)
  );

  const selectedSector = sectors?.find(s => s.id === sectorId);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] sm:max-w-[560px] p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b border-[var(--surface-2)]">
          <DialogTitle className="text-[var(--text-primary)] font-serif text-xl flex items-center justify-between">
            Nova Tarefa
            <button onClick={onClose} className="text-[var(--text-subtle)] hover:text-[var(--text-primary)] transition-colors">
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
              placeholder="Título da tarefa... (use #setor, ##lista, P1-P4, amanhã às 21h)"
              className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus-visible:ring-[#C9A84C] focus-visible:border-[#C9A84C] h-11 text-base"
            />
            {showHashDropdown && filteredSectors && filteredSectors.length > 0 && (
              <div className="absolute top-full mt-1 left-0 z-50 bg-[var(--surface-0)] border border-[var(--surface-2)] rounded-lg shadow-xl overflow-hidden min-w-[180px]">
                {filteredSectors.map(s => (
                  <button
                    key={s.id}
                    onMouseDown={(e) => { e.preventDefault(); selectSectorFromHash(s.id); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors text-left"
                  >
                    <Hash className="h-3 w-3" style={{ color: s.color }} />
                    {s.label}
                  </button>
                ))}
              </div>
            )}
            {showListDropdown && filteredLists.length > 0 && (
              <div className="absolute top-full mt-1 left-0 z-50 bg-[var(--surface-0)] border border-[var(--surface-2)] rounded-lg shadow-xl overflow-hidden min-w-[180px]">
                {filteredLists.map(l => (
                  <button
                    key={l.id}
                    onMouseDown={(e) => { e.preventDefault(); selectListFromHash(l); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors text-left"
                  >
                    <List className="h-3 w-3" style={{ color: l.color }} />
                    {l.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {targetList && (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium" style={{ color: targetList.color, backgroundColor: targetList.color + "22" }}>
                <List className="h-3 w-3" />
                Vai virar item da lista: {targetList.name}
              </span>
              <button onClick={() => setTargetList(null)} className="text-xs text-[var(--text-subtle)] hover:text-[#E53E3E]">remover</button>
            </div>
          )}

          {/* Preview de data/hora detectada */}
          {(parsedDate || parsedTime) && (
            <div className="flex items-center gap-2 text-xs text-[#C9A84C]">
              <CalendarClock className="h-3.5 w-3.5" />
              {parsedDate ? format(parsedDate, "EEEE, d 'de' MMMM", { locale: ptBR }) : ""}
              {parsedTime ? ` às ${String(parsedTime.hours).padStart(2,"0")}:${String(parsedTime.minutes).padStart(2,"0")}` : ""}
            </div>
          )}

          {/* Descrição */}
          <TaskDescriptionEditor value={description} onChange={setDescription} editable placeholder="Descrição (opcional)..." />

          {/* Prioridade */}
          <div className="space-y-2">
            <label className="text-xs text-[var(--text-subtle)] uppercase tracking-widest flex items-center gap-1">
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
                      : "border-[var(--surface-2)] text-[var(--text-subtle)] hover:border-opacity-60"
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
            <label className="text-xs text-[var(--text-subtle)] uppercase tracking-widest flex items-center gap-1">
              <Hash className="h-3 w-3" />
              Setor
            </label>
            <div className="flex flex-wrap gap-2">
              {sectors?.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSectorId(sectorId === s.id ? null : s.id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                    sectorId === s.id ? "text-[var(--surface-0)] font-bold" : "text-[var(--text-muted)]"
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

          {/* Projeto e Meta */}
          {(projects?.length || goals?.length) ? (
            <div className="grid grid-cols-2 gap-3">
              {!!projects?.length && (
                <div className="space-y-2">
                  <label className="text-xs text-[var(--text-subtle)] uppercase tracking-widest">Projeto</label>
                  <select
                    value={projectId ?? ""}
                    onChange={(e) => setProjectId(e.target.value || null)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--surface-2)] text-[var(--text-primary)] text-sm rounded-lg h-9 px-2 focus:outline-none focus:border-[#C9A84C]"
                  >
                    <option value="">Nenhum</option>
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
              {!!goals?.length && (
                <div className="space-y-2">
                  <label className="text-xs text-[var(--text-subtle)] uppercase tracking-widest">Meta</label>
                  <select
                    value={goalId ?? ""}
                    onChange={(e) => setGoalId(e.target.value || null)}
                    className="w-full bg-[var(--surface-2)] border border-[var(--surface-2)] text-[var(--text-primary)] text-sm rounded-lg h-9 px-2 focus:outline-none focus:border-[#C9A84C]"
                  >
                    <option value="">Nenhuma</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>{g.title}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-subtle)] uppercase tracking-widest">Tempo estimado (min)</label>
            <Input
              type="number"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              placeholder="Opcional, ex: 30"
              className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] h-9 text-sm w-32"
            />
          </div>

          {/* Anexos */}
          <div className="space-y-2">
            <label className="text-xs text-[var(--text-subtle)] uppercase tracking-widest flex items-center gap-1">
              <Paperclip className="h-3 w-3" />
              Anexos
            </label>
            {!!pendingAttachments.length && (
              <div className="flex flex-wrap gap-1.5">
                {pendingAttachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--surface-2)] text-[var(--text-primary)] text-xs">
                    <Paperclip className="h-3 w-3 shrink-0 text-[#C9A84C]" />
                    <span className="truncate max-w-[140px]">{a.name}</span>
                    <button onClick={() => removePendingAttachment(i)} className="text-[var(--text-subtle)] hover:text-[#E53E3E]">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            {uploadError && <p className="text-xs text-[#E53E3E]">{uploadError}</p>}
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-dashed border-[var(--surface-2)] text-[var(--text-muted)] text-sm hover:text-[#C9A84C] hover:border-[#C9A84C]/40 disabled:opacity-40 transition-colors"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              Enviar do dispositivo
            </button>
          </div>

          {/* Adiar */}
          <div className="space-y-2">
            <label className="text-xs text-[var(--text-subtle)] uppercase tracking-widest flex items-center gap-1">
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
                      : "border-[var(--surface-2)] text-[var(--text-muted)] hover:border-[#C9A84C] hover:text-[#C9A84C]"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-[var(--surface-2)] border-t border-[var(--surface-2)] flex items-center justify-between gap-3">
          <div className="text-xs text-[var(--text-subtle)]">
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
              className="text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-1)]"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!text.trim() || createTask.isPending}
              className="bg-[#C9A84C] hover:bg-[#E2C06E] text-[var(--surface-0)] font-bold"
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
