import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bug, Lightbulb, Star, Send, CheckCircle2 } from "lucide-react";

const TYPES = [
  { key: "bug", label: "Reportar bug", icon: Bug, color: "#E53E3E" },
  { key: "improvement", label: "Melhoria", icon: Lightbulb, color: "#C9A84C" },
  { key: "feature", label: "Nova funcionalidade", icon: Star, color: "#3B82F6" },
];

interface FeedbackModalProps { open: boolean; onClose: () => void; }

export default function FeedbackModal({ open, onClose }: FeedbackModalProps) {
  const [type, setType] = useState("bug");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!message.trim()) return;
    setLoading(true);
    try {
      await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, message }),
      });
      setSent(true);
      setTimeout(() => { setSent(false); setMessage(""); onClose(); }, 2000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-[#162236] border-[#1A2B42] text-[#F0EBE3] sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="font-serif text-[#F0EBE3] flex items-center gap-2">
            <MessageCircleIcon /> Mãos amigas
          </DialogTitle>
        </DialogHeader>

        {sent ? (
          <div className="text-center py-8">
            <CheckCircle2 className="h-12 w-12 text-[#38A169] mx-auto mb-3" />
            <p className="text-[#F0EBE3] font-semibold">Feedback enviado!</p>
            <p className="text-sm text-[#A89880]">Obrigado pela contribuição.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-[#A89880]">Reporte bugs, sugira melhorias ou peça novas funcionalidades. Sua voz importa!</p>

            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(t => (
                <button
                  key={t.key}
                  onClick={() => setType(t.key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-medium transition-all ${type === t.key ? "border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]" : "border-[#1A2B42] text-[#A89880] hover:border-[#C9A84C]/30"}`}
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
              className="bg-[#1A2B42] border-[#1A2B42] text-[#F0EBE3] placeholder:text-[#6B7A8D] focus-visible:ring-[#C9A84C] resize-none h-28"
            />

            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose} className="text-[#A89880] hover:text-[#F0EBE3]">Cancelar</Button>
              <Button
                onClick={handleSend}
                disabled={!message.trim() || loading}
                className="btn-gold text-[#0D1B2A] font-bold"
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

function MessageCircleIcon() {
  return <span>🤝</span>;
}
