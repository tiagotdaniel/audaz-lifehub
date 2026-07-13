import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { Gauge } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface ProductivityProfile {
  dailyWorkHours: number;
  tasksPerDayEstimate: number;
  estimatedTimeLostMinutes: number;
  productivityRating: number;
  completedAt?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: (profile: ProductivityProfile) => void;
  initial?: ProductivityProfile | null;
}

const DEFAULTS: ProductivityProfile = {
  dailyWorkHours: 8,
  tasksPerDayEstimate: 5,
  estimatedTimeLostMinutes: 30,
  productivityRating: 5,
};

export default function ProductivityQuestionnaireModal({ open, onClose, onSaved, initial }: Props) {
  const { getToken } = useAuth();
  const [form, setForm] = useState<ProductivityProfile>(initial ?? DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) setForm(initial ?? DEFAULTS);
  }, [open, initial]);

  const handleSubmit = async () => {
    setSaving(true);
    const token = await getToken();
    const res = await fetch("/api/productivity-profile", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const saved = await res.json();
    setSaving(false);
    onSaved?.(saved);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[480px] bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)]">
        <DialogHeader>
          <DialogTitle className="text-[var(--text-primary)] font-serif text-xl flex items-center gap-2">
            <Gauge className="h-5 w-5 text-[#C9A84C]" />
            Sua rotina atual
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-[var(--text-muted)] -mt-2">
          Responda rapidamente para calcularmos quanto tempo o Audaz LifeHub está economizando para você.
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-subtle)] uppercase tracking-widest">
              Horas de trabalho/estudo por dia
            </label>
            <Input
              type="number"
              min={0}
              max={24}
              value={form.dailyWorkHours}
              onChange={(e) => setForm((f) => ({ ...f, dailyWorkHours: Number(e.target.value) }))}
              className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-subtle)] uppercase tracking-widest">
              Quantas tarefas/compromissos você lida por dia, em média?
            </label>
            <Input
              type="number"
              min={0}
              value={form.tasksPerDayEstimate}
              onChange={(e) => setForm((f) => ({ ...f, tasksPerDayEstimate: Number(e.target.value) }))}
              className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-subtle)] uppercase tracking-widest">
              Quantos minutos por dia você estima perder com desorganização, esquecimento ou procurando informações?
            </label>
            <Input
              type="number"
              min={0}
              value={form.estimatedTimeLostMinutes}
              onChange={(e) => setForm((f) => ({ ...f, estimatedTimeLostMinutes: Number(e.target.value) }))}
              className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs text-[var(--text-subtle)] uppercase tracking-widest">
              Nota da sua produtividade atual (1 a 10)
            </label>
            <div className="flex gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => setForm((f) => ({ ...f, productivityRating: n }))}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-all ${
                    form.productivityRating === n
                      ? "border-[#C9A84C] bg-[#C9A84C]/20 text-[#C9A84C]"
                      : "border-[var(--surface-2)] text-[var(--text-muted)] hover:border-[#C9A84C]/40"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-2)]">
            Agora não
          </Button>
          <Button onClick={handleSubmit} disabled={saving} className="flex-1 bg-[#C9A84C] hover:bg-[#E2C06E] text-[var(--surface-0)] font-bold">
            {saving ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
