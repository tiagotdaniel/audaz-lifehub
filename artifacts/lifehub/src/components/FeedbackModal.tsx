import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { fileToAttachment, type Attachment } from "@/lib/fileUpload";
import { Bug, MessageSquare, Heart, Lightbulb, Send, CheckCircle2, Paperclip, X, Upload, Loader2 } from "lucide-react";

const TYPES = [
  { key: "bug", label: "Bug", icon: Bug, color: "#E53E3E" },
  { key: "feedback", label: "Feedback", icon: MessageSquare, color: "#3B82F6" },
  { key: "praise", label: "Elogio", icon: Heart, color: "#EC4899" },
  { key: "feature", label: "Sugestão", icon: Lightbulb, color: "#C9A84C" },
];

interface FeedbackModalProps { open: boolean; onClose: () => void; }

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [type, setType] = useState("bug");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    setUploading(true);
    setUploadError("");
    try {
      const newAttachments = await Promise.all(Array.from(files).map(fileToAttachment));
      setAttachments((prev) => [...prev, ...newAttachments]);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Não foi possível anexar o arquivo.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const removeAttachment = (idx: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSend = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message, attachments }),
      });
      setSent(true);
      setTimeout(() => { setSent(false); setMessage(""); setAttachments([]); onClose(); }, 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-[var(--text-primary)] flex items-center gap-2">
            🤝 Mãos amigas
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-[#38A169] mx-auto mb-3" />
            <p className="text-[var(--text-primary)] font-semibold">Feedback enviado!</p>
            <p className="text-sm text-[var(--text-muted)]">Obrigado pela contribuição.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[var(--text-muted)]">Reporte bugs, sugira melhorias, mande um elogio ou peça novas funcionalidades. Sua voz importa!</p>

            <div className="grid grid-cols-4 gap-2">
              {TYPES.map(t => (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${type === t.key ? "border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]" : "border-[var(--surface-2)] text-[var(--text-muted)] hover:border-[#C9A84C]/30"}`}
                >
                  <t.icon className="h-5 w-5" style={{ color: type === t.key ? t.color : undefined }} />
                  {t.label}
                </button>
              ))}
            </div>

            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Descreva seu feedback com detalhes..."
              className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus-visible:ring-[#C9A84C] resize-none h-28"
            />

            {!!attachments.length && (
              <div className="flex flex-wrap gap-1.5">
                {attachments.map((a, i) => (
                  <div key={i} className="flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--surface-2)] text-[var(--text-primary)] text-xs">
                    <Paperclip className="h-3 w-3 shrink-0 text-[#C9A84C]" />
                    <span className="truncate max-w-[140px]">{a.name}</span>
                    <button onClick={() => removeAttachment(i)} className="text-[var(--text-subtle)] hover:text-[#E53E3E]">
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
              Anexar arquivo
            </button>

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">Cancelar</Button>
              <Button
                onClick={handleSend}
                disabled={!message.trim() || loading}
                className="btn-gold text-[var(--surface-0)] font-bold"
              >
                <Send className="h-4 w-4 mr-2" />
                {loading ? "Enviando..." : "Enviar feedback"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
