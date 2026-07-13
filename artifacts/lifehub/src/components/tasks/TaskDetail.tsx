import { useState, useEffect, useRef } from "react";
import {
  useGetTask, useUpdateTask, useCompleteTask, useExecuteTask, useDeleteTask,
  useGetSectors, useGetProjects, useGetGoals,
  getGetTasksQueryKey, getGetTaskQueryKey,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/react";
import { useTimerStore } from "@/store/timerStore";
import { fileToAttachment, type Attachment as UploadedAttachment } from "@/lib/fileUpload";
import TaskDescriptionEditor from "./TaskDescriptionEditor";
import { X, Play, Check, Clock, Trash2, AlertTriangle, CalendarClock, SkipForward, Pencil, MessageSquare, Paperclip, Send, Link as LinkIcon, Smile, AtSign, CornerDownRight, Upload, Loader2 } from "lucide-react";
import { format, addDays, nextSaturday, nextMonday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface TaskDetailProps {
  taskId: string;
  onClose: () => void;
  onDeleted?: () => void;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  parentId?: string | null;
  attachments?: UploadedAttachment[];
  author: { name: string; avatarUrl: string | null } | null;
}

interface WorkspaceMemberRef { id: string; email: string; role: string; status: string; }

const EMOJIS = ["😀", "😂", "😍", "👍", "👎", "🎉", "🔥", "💡", "✅", "❌", "⚠️", "❤️", "🙏", "👏", "🚀", "💯", "😅", "🤔", "😢", "😡"];

interface Attachment {
  id: string;
  name: string;
  url: string;
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

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

const SNOOZE_OPTIONS = [
  { label: "Amanhã", getValue: () => addDays(new Date(), 1) },
  { label: "+2 dias", getValue: () => addDays(new Date(), 2) },
  { label: "Fim de semana", getValue: () => nextSaturday(new Date()) },
  { label: "Próxima semana", getValue: () => nextMonday(new Date()) },
];

function useAuthedFetch() {
  const { getToken } = useAuth();
  return async (path: string, opts?: RequestInit) => {
    const token = await getToken();
    const res = await fetch(path, {
      ...opts,
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}`, ...(opts?.headers ?? {}) },
    });
    return res.json();
  };
}

function CommentsSection({ taskId }: { taskId: string }) {
  const authedFetch = useAuthedFetch();
  const [comments, setComments] = useState<Comment[]>([]);
  const [members, setMembers] = useState<WorkspaceMemberRef[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [collapsedThreads, setCollapsedThreads] = useState<Set<string>>(new Set());
  const [pendingAttachments, setPendingAttachments] = useState<UploadedAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleThread = (id: string) => {
    setCollapsedThreads((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const load = () => {
    setLoading(true);
    authedFetch(`/api/comments/tasks/${taskId}`).then((data) => {
      setComments(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [taskId]);
  useEffect(() => {
    authedFetch("/api/members").then((d) => setMembers(Array.isArray(d) ? d : [])).catch(() => {});
  }, []);

  const handleTextChange = (val: string) => {
    setNewComment(val);
    const at = val.lastIndexOf("@");
    if (at !== -1 && val.slice(at + 1).match(/^[\w.]*$/)) {
      setShowMentions(true);
      setMentionQuery(val.slice(at + 1).toLowerCase());
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (email: string) => {
    const at = newComment.lastIndexOf("@");
    setNewComment(newComment.slice(0, at) + `@${email} `);
    setShowMentions(false);
    textareaRef.current?.focus();
  };

  const insertEmoji = (emoji: string) => {
    setNewComment((prev) => prev + emoji);
    setShowEmoji(false);
    textareaRef.current?.focus();
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

  const handleSend = async () => {
    if (!newComment.trim()) return;
    setSending(true);
    const mentionedUserIds = members.filter((m) => newComment.includes(`@${m.email}`)).map((m) => m.id);
    await authedFetch(`/api/comments/tasks/${taskId}`, {
      method: "POST",
      body: JSON.stringify({ content: newComment.trim(), parentId: replyingTo, mentionedUserIds, attachments: pendingAttachments }),
    });
    setNewComment("");
    setReplyingTo(null);
    setPendingAttachments([]);
    setSending(false);
    load();
  };

  const handleDelete = async (id: string) => {
    await authedFetch(`/api/comments/${id}`, { method: "DELETE" });
    load();
  };

  const filteredMembers = members.filter((m) => !mentionQuery || m.email.toLowerCase().includes(mentionQuery));
  const topLevel = comments.filter((c) => !c.parentId);
  const repliesOf = (id: string) => comments.filter((c) => c.parentId === id);

  const renderComment = (c: Comment, isReply: boolean) => {
    const replies = !isReply ? repliesOf(c.id) : [];
    const collapsed = collapsedThreads.has(c.id);
    return (
      <div key={c.id} className={isReply ? "ml-6 mt-2 border-l-2 border-[var(--surface-0)] pl-3" : ""}>
        <div className="p-2.5 rounded-lg bg-[var(--surface-2)] text-sm group">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-semibold text-[#C9A84C]">{c.author?.name ?? "Você"}</span>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-subtle)]">{format(new Date(c.createdAt), "d MMM, HH:mm", { locale: ptBR })}</span>
              <button onClick={() => handleDelete(c.id)} className="text-[var(--text-subtle)] hover:text-[#E53E3E] opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          </div>
          <p className="text-[var(--text-primary)] whitespace-pre-wrap">
            {c.content.split(/(@[\w.]+@[\w.]+\.\w+)/g).map((part, i) =>
              part.startsWith("@") ? <span key={i} className="text-[#C9A84C] font-medium">{part}</span> : part
            )}
          </p>
          {!!c.attachments?.length && (
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {c.attachments.map((a, i) => (
                <a
                  key={i}
                  href={a.url}
                  download={a.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 rounded bg-[var(--surface-0)] text-[var(--text-muted)] hover:text-[#C9A84C] text-xs max-w-full"
                >
                  <Paperclip className="h-3 w-3 shrink-0" />
                  <span className="truncate">{a.name}</span>
                </a>
              ))}
            </div>
          )}
          {!isReply && (
            <div className="flex items-center gap-3 mt-1.5">
              <button
                onClick={() => { setReplyingTo(c.id); textareaRef.current?.focus(); }}
                className="flex items-center gap-1 text-xs text-[var(--text-subtle)] hover:text-[#C9A84C] transition-colors"
              >
                <CornerDownRight className="h-3 w-3" /> Responder
              </button>
              {replies.length > 0 && (
                <button
                  onClick={() => toggleThread(c.id)}
                  className="text-xs text-[var(--text-subtle)] hover:text-[#C9A84C] transition-colors"
                >
                  {collapsed ? `Ver ${replies.length} resposta${replies.length !== 1 ? "s" : ""}` : "Ocultar respostas"}
                </button>
              )}
            </div>
          )}
        </div>
        {!collapsed && replies.map((r) => renderComment(r, true))}
      </div>
    );
  };

  return (
    <div className="pt-4 border-t border-[var(--surface-2)] space-y-3">
      <h3 className="text-xs text-[var(--text-subtle)] uppercase tracking-widest flex items-center gap-2">
        <MessageSquare className="h-3 w-3" />
        Comentários
      </h3>
      {loading ? (
        <p className="text-sm text-[var(--text-subtle)]">Carregando...</p>
      ) : comments.length === 0 ? (
        <p className="text-sm text-[var(--text-subtle)]">Nenhum comentário ainda.</p>
      ) : (
        <div className="space-y-2">{topLevel.map((c) => renderComment(c, false))}</div>
      )}

      {replyingTo && (
        <div className="flex items-center justify-between text-xs text-[#C9A84C] bg-[var(--surface-2)] px-2.5 py-1.5 rounded-lg">
          <span className="flex items-center gap-1"><CornerDownRight className="h-3 w-3" /> Respondendo comentário</span>
          <button onClick={() => setReplyingTo(null)} className="text-[var(--text-subtle)] hover:text-[var(--text-primary)]">Cancelar</button>
        </div>
      )}

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

      <div className="relative">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Textarea
              ref={textareaRef}
              value={newComment}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Adicionar comentário... use @ para marcar alguém"
              className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus-visible:ring-[#C9A84C] resize-none h-16 text-sm"
            />
            {showMentions && filteredMembers.length > 0 && (
              <div className="absolute bottom-full mb-1 left-0 bg-[var(--surface-0)] border border-[var(--surface-2)] rounded-lg shadow-xl z-20 w-56 overflow-hidden">
                {filteredMembers.map((m) => (
                  <button
                    key={m.id}
                    onMouseDown={(e) => { e.preventDefault(); insertMention(m.email); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--surface-2)] transition-colors text-left"
                  >
                    <AtSign className="h-3 w-3 text-[#C9A84C]" /> {m.email}
                  </button>
                ))}
              </div>
            )}
            {showEmoji && (
              <div className="absolute bottom-full mb-1 right-0 bg-[var(--surface-0)] border border-[var(--surface-2)] rounded-lg shadow-xl z-20 p-2 grid grid-cols-5 gap-1 w-48">
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => insertEmoji(e)} className="text-lg p-1 rounded hover:bg-[var(--surface-2)] transition-colors">
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1 self-end">
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="p-2 rounded-lg bg-[var(--surface-2)] text-[var(--text-subtle)] hover:text-[#C9A84C] disabled:opacity-40 transition-colors"
              title="Anexar arquivo do dispositivo"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setShowEmoji((v) => !v)}
              className="p-2 rounded-lg bg-[var(--surface-2)] text-[var(--text-subtle)] hover:text-[#C9A84C] transition-colors"
              title="Emoji"
            >
              <Smile className="h-4 w-4" />
            </button>
            <button
              onClick={handleSend}
              disabled={sending || !newComment.trim()}
              className="p-2 rounded-lg bg-[#C9A84C] text-[var(--surface-0)] disabled:opacity-40 hover:bg-[#E2C06E] transition-colors"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AttachmentsSection({ taskId }: { taskId: string }) {
  const authedFetch = useAuthedFetch();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    authedFetch(`/api/attachments/tasks/${taskId}`).then((data) => {
      setAttachments(Array.isArray(data) ? data : []);
      setLoading(false);
    });
  };

  useEffect(() => { load(); }, [taskId]);

  const handleAdd = async () => {
    if (!name.trim() || !url.trim()) return;
    await authedFetch(`/api/attachments/tasks/${taskId}`, {
      method: "POST",
      body: JSON.stringify({ name: name.trim(), url: url.trim() }),
    });
    setName("");
    setUrl("");
    load();
  };

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setUploadError("");
    try {
      for (const file of Array.from(files)) {
        const att = await fileToAttachment(file);
        await authedFetch(`/api/attachments/tasks/${taskId}`, {
          method: "POST",
          body: JSON.stringify(att),
        });
      }
      load();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Não foi possível anexar o arquivo.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    await authedFetch(`/api/attachments/${id}`, { method: "DELETE" });
    load();
  };

  return (
    <div className="pt-4 border-t border-[var(--surface-2)] space-y-3">
      <h3 className="text-xs text-[var(--text-subtle)] uppercase tracking-widest flex items-center gap-2">
        <Paperclip className="h-3 w-3" />
        Anexos
      </h3>
      {loading ? (
        <p className="text-sm text-[var(--text-subtle)]">Carregando...</p>
      ) : attachments.length === 0 ? (
        <p className="text-sm text-[var(--text-subtle)]">Nenhum anexo. Cole um link (Google Drive, Dropbox, etc).</p>
      ) : (
        <div className="space-y-1.5">
          {attachments.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-2)] text-sm group">
              <a href={a.url} download={a.name} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-[#C9A84C] hover:underline truncate">
                <LinkIcon className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{a.name}</span>
              </a>
              <button onClick={() => handleDelete(a.id)} className="text-[var(--text-subtle)] hover:text-[#E53E3E] opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
      {uploadError && <p className="text-xs text-[#E53E3E]">{uploadError}</p>}
      <div className="flex gap-2">
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
      <div className="flex gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome"
          className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] text-sm h-9 flex-1"
        />
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Link (URL)"
          className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] text-sm h-9 flex-[2]"
        />
        <button
          onClick={handleAdd}
          disabled={!name.trim() || !url.trim()}
          className="p-2 rounded-lg bg-[#C9A84C] text-[var(--surface-0)] disabled:opacity-40 hover:bg-[#E2C06E] transition-colors shrink-0"
        >
          <Paperclip className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default function TaskDetail({ taskId, onClose, onDeleted }: TaskDetailProps) {
  const qc = useQueryClient();
  const { setActive, reset: resetTimer } = useTimerStore();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPriority, setEditPriority] = useState(4);
  const [editSectorId, setEditSectorId] = useState<string | null>(null);
  const [editProjectId, setEditProjectId] = useState<string | null>(null);
  const [editGoalId, setEditGoalId] = useState<string | null>(null);
  const [editEstimatedMinutes, setEditEstimatedMinutes] = useState("");

  const { data: task, isLoading } = useGetTask(taskId, {
    query: { enabled: !!taskId, queryKey: getGetTaskQueryKey(taskId) },
  });
  const { data: sectors } = useGetSectors();
  const { data: projects } = useGetProjects();
  const { data: goals } = useGetGoals();

  const executeTask = useExecuteTask();
  const completeTask = useCompleteTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const startEditing = () => {
    if (!task) return;
    setEditTitle(task.title);
    setEditDescription(task.description ?? "");
    setEditPriority(task.priority);
    setEditSectorId(task.sectorId ?? null);
    setEditProjectId(task.projectId ?? null);
    setEditGoalId(task.goalId ?? null);
    setEditEstimatedMinutes(task.estimatedMinutes?.toString() ?? "");
    setEditing(true);
  };

  const handleSaveEdit = () => {
    if (!editTitle.trim()) return;
    updateTask.mutate({
      id: taskId,
      data: {
        title: editTitle.trim(),
        description: editDescription.trim() || undefined,
        priority: editPriority,
        sectorId: editSectorId ?? undefined,
        projectId: editProjectId ?? undefined,
        goalId: editGoalId ?? undefined,
        estimatedMinutes: editEstimatedMinutes ? parseInt(editEstimatedMinutes) : undefined,
      },
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        qc.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
        setEditing(false);
      },
    });
  };

  const handleExecute = () => {
    executeTask.mutate(
      { id: taskId },
      {
        onSuccess: (res) => {
          setActive(taskId, res.session.id);
          qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
          qc.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
        },
      }
    );
  };

  const handleComplete = () => {
    completeTask.mutate({ id: taskId }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        qc.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
        onClose();
      },
    });
  };

  const handleCancel = () => {
    updateTask.mutate({ id: taskId, data: { status: "cancelled" } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        onClose();
      },
    });
  };

  const handlePermanentDelete = () => {
    deleteTask.mutate({ id: taskId }, {
      onSuccess: () => {
        resetTimer();
        qc.invalidateQueries({ queryKey: getGetTasksQueryKey() });
        onDeleted?.();
        onClose();
      },
      onSettled: () => setShowDeleteConfirm(false),
    });
  };

  const handleSnooze = (getValue: () => Date) => {
    const d = getValue();
    updateTask.mutate({ id: taskId, data: { dueDate: d.toISOString() } }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetTaskQueryKey(taskId) });
      },
    });
  };

  return (
    <>
      <Dialog open={!!taskId} onOpenChange={(open) => !open && onClose()}>
        <DialogContent
          className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)]"
        >
          {isLoading || !task ? (
            <div className="text-center py-20 text-[var(--text-subtle)]">Carregando...</div>
          ) : editing ? (
            <>
              <DialogHeader className="mb-6">
                <DialogTitle className="text-[var(--text-primary)] font-serif text-xl">Editar tarefa</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs text-[var(--text-subtle)] uppercase tracking-widest">Título</label>
                  <Input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-[var(--text-subtle)] uppercase tracking-widest">Descrição</label>
                  <TaskDescriptionEditor value={editDescription} onChange={setEditDescription} editable />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-[var(--text-subtle)] uppercase tracking-widest">Prioridade</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4].map((p) => (
                      <button
                        key={p}
                        onClick={() => setEditPriority(p)}
                        className="flex-1 py-2 rounded-lg text-xs font-bold border transition-all"
                        style={{
                          borderColor: PRIORITY_COLORS[p],
                          backgroundColor: editPriority === p ? PRIORITY_COLORS[p] + "33" : "transparent",
                          color: PRIORITY_COLORS[p],
                        }}
                      >
                        P{p}
                      </button>
                    ))}
                  </div>
                </div>
                {!!sectors?.length && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-[var(--text-subtle)] uppercase tracking-widest">Setor</label>
                    <div className="flex flex-wrap gap-2">
                      {sectors.map((s) => (
                        <button
                          key={s.id}
                          onClick={() => setEditSectorId(editSectorId === s.id ? null : s.id)}
                          className="px-3 py-1.5 rounded-full text-xs font-medium border transition-all"
                          style={{
                            borderColor: s.color,
                            backgroundColor: editSectorId === s.id ? s.color : "transparent",
                            color: editSectorId === s.id ? "#0D1B2A" : "#A89880",
                          }}
                        >
                          {s.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {!!projects?.length && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-[var(--text-subtle)] uppercase tracking-widest">Projeto</label>
                    <select
                      value={editProjectId ?? ""}
                      onChange={(e) => setEditProjectId(e.target.value || null)}
                      className="w-full bg-[var(--surface-2)] border border-[var(--surface-2)] text-[var(--text-primary)] text-sm rounded-lg h-9 px-2"
                    >
                      <option value="">Nenhum</option>
                      {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                )}
                {!!goals?.length && (
                  <div className="space-y-1.5">
                    <label className="text-xs text-[var(--text-subtle)] uppercase tracking-widest">Meta</label>
                    <select
                      value={editGoalId ?? ""}
                      onChange={(e) => setEditGoalId(e.target.value || null)}
                      className="w-full bg-[var(--surface-2)] border border-[var(--surface-2)] text-[var(--text-primary)] text-sm rounded-lg h-9 px-2"
                    >
                      <option value="">Nenhuma</option>
                      {goals.map((g) => <option key={g.id} value={g.id}>{g.title}</option>)}
                    </select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <label className="text-xs text-[var(--text-subtle)] uppercase tracking-widest">Tempo estimado (min)</label>
                  <Input
                    type="number"
                    value={editEstimatedMinutes}
                    onChange={(e) => setEditEstimatedMinutes(e.target.value)}
                    placeholder="Opcional"
                    className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)] w-32"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setEditing(false)}
                    className="flex-1 py-2 rounded-lg border border-[var(--surface-2)] text-[var(--text-muted)] text-sm hover:bg-[var(--surface-2)] transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleSaveEdit}
                    disabled={!editTitle.trim() || updateTask.isPending}
                    className="flex-1 py-2 rounded-lg bg-[#C9A84C] text-[var(--surface-0)] font-bold text-sm hover:bg-[#E2C06E] disabled:opacity-50 transition-colors"
                  >
                    {updateTask.isPending ? "Salvando..." : "Salvar"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <>
              <DialogHeader className="mb-6">
                <div className="flex items-start gap-3">
                  <div
                    className="w-1 self-stretch rounded-full shrink-0 mt-1"
                    style={{ backgroundColor: PRIORITY_COLORS[task.priority] }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <DialogTitle className="text-[var(--text-primary)] text-xl font-semibold leading-snug text-left font-serif break-words">
                        {task.title}
                      </DialogTitle>
                      <button onClick={startEditing} className="shrink-0 text-[var(--text-subtle)] hover:text-[#C9A84C] transition-colors" title="Editar tarefa">
                        <Pencil className="h-4 w-4" />
                      </button>
                    </div>
                    <p className="text-sm mt-1" style={{ color: PRIORITY_COLORS[task.priority] }}>
                      {PRIORITY_LABELS[task.priority]}
                    </p>
                    <div className="mt-2">
                      <TaskDescriptionEditor value={task.description ?? ""} onChange={() => {}} editable={false} />
                    </div>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-6">
                {/* Ações principais */}
                <div className="flex gap-2 flex-wrap">
                  {task.status === "pending" && (
                    <button
                      onClick={handleExecute}
                      disabled={executeTask.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#C9A84C] text-[var(--surface-0)] font-bold text-sm hover:bg-[#E2C06E] transition-colors"
                    >
                      <Play className="h-4 w-4" fill="currentColor" />
                      Executar
                    </button>
                  )}
                  {task.status !== "done" && task.status !== "cancelled" && (
                    <button
                      onClick={handleComplete}
                      disabled={completeTask.isPending}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#38A169] text-white font-bold text-sm hover:bg-[#48BB78] transition-colors"
                    >
                      <Check className="h-4 w-4" />
                      Concluir
                    </button>
                  )}
                </div>

                {/* Adiar */}
                <div className="space-y-2">
                  <h3 className="text-xs text-[var(--text-subtle)] uppercase tracking-widest flex items-center gap-2">
                    <SkipForward className="h-3 w-3" />
                    Adiar para
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {SNOOZE_OPTIONS.map(opt => (
                      <button
                        key={opt.label}
                        onClick={() => handleSnooze(opt.getValue)}
                        className="px-3 py-1.5 rounded-lg text-xs bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[#C9A84C] hover:bg-[var(--surface-0)] border border-[var(--surface-2)] hover:border-[#C9A84C] transition-all"
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Informações */}
                <div className="space-y-3">
                  {task.dueDate && (
                    <div className="flex justify-between">
                      <span className="text-xs text-[var(--text-subtle)] flex items-center gap-1">
                        <CalendarClock className="h-3 w-3" />
                        Prazo
                      </span>
                      <span className="text-sm text-[var(--text-primary)]">
                        {format(new Date(task.dueDate), "d MMM yyyy, HH:mm", { locale: ptBR })}
                      </span>
                    </div>
                  )}
                  {task.sector && (
                    <div className="flex justify-between">
                      <span className="text-xs text-[var(--text-subtle)]">Setor</span>
                      <span className="text-sm px-2 py-0.5 rounded-full" style={{ color: task.sector.color, backgroundColor: task.sector.color + "22" }}>
                        {task.sector.label}
                      </span>
                    </div>
                  )}
                  {task.project && (
                    <div className="flex justify-between">
                      <span className="text-xs text-[var(--text-subtle)]">Projeto</span>
                      <span className="text-sm text-[var(--text-primary)]">{task.project.name}</span>
                    </div>
                  )}
                  {task.goal && (
                    <div className="flex justify-between">
                      <span className="text-xs text-[var(--text-subtle)]">Meta</span>
                      <span className="text-sm text-[var(--text-primary)]">{task.goal.title}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-xs text-[var(--text-subtle)] flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Tempo total
                    </span>
                    <span className="text-sm text-[#C9A84C] font-mono font-bold">
                      {task.totalTimeSeconds ? formatDuration(task.totalTimeSeconds) : "—"}
                    </span>
                  </div>
                </div>

                <CommentsSection taskId={taskId} />
                <AttachmentsSection taskId={taskId} />

                {/* Ações de exclusão */}
                <div className="pt-4 border-t border-[var(--surface-2)] space-y-2">
                  <h3 className="text-xs text-[var(--text-subtle)] uppercase tracking-widest mb-2">Ações</h3>
                  {task.status !== "cancelled" && (
                    <button
                      onClick={handleCancel}
                      className="w-full flex items-center gap-2 px-4 py-2 rounded-lg border border-[#ED8936] text-[#ED8936] text-sm hover:bg-[#ED8936]/10 transition-colors"
                    >
                      <X className="h-4 w-4" />
                      Cancelar tarefa
                    </button>
                  )}
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="w-full flex items-center gap-2 px-4 py-2 rounded-lg border border-[#E53E3E] text-[#E53E3E] text-sm hover:bg-[#E53E3E]/10 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    Excluir permanentemente
                  </button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)]">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-[#E53E3E] font-serif">
              <AlertTriangle className="h-5 w-5" />
              Excluir tarefa permanentemente?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-[var(--text-muted)]">
              Tem certeza? Esta ação não pode ser desfeita. A tarefa e todas as suas sessões de tempo serão removidas permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)] hover:bg-[var(--surface-0)]">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePermanentDelete}
              disabled={deleteTask.isPending}
              className="bg-[#E53E3E] text-white hover:bg-[#C53030]"
            >
              {deleteTask.isPending ? "Excluindo..." : "Excluir"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
