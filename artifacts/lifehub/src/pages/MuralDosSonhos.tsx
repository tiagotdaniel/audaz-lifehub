import { useState, useEffect, useRef } from "react";
import { useAuth } from "@clerk/react";
import { Plus, Trash2, Image, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DreamItem { id: string; imageUrl: string; quote?: string; }

export default function MuralDosSonhos() {
  const { getToken } = useAuth();
  const [items, setItems] = useState<DreamItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ imageUrl: "", quote: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processingImage, setProcessingImage] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const authFetch = async (path: string, opts?: RequestInit) => {
    const token = await getToken();
    const res = await fetch(path, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, ...opts });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: `Erro ${res.status}` }));
      throw new Error(body.error ?? `Erro ${res.status}`);
    }
    return res.json();
  };

  useEffect(() => {
    authFetch("/api/dream-board").then(d => { setItems(d); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  const handleCreate = async () => {
    if (!form.imageUrl) return;
    setSubmitting(true);
    setError(null);
    try {
      const data = await authFetch("/api/dream-board", { method: "POST", body: JSON.stringify(form) });
      setItems(prev => [...prev, data]);
      setOpen(false);
      setForm({ imageUrl: "", quote: "" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível enviar. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    await authFetch(`/api/dream-board/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const resizeImage = (file: File, maxDim = 1600, quality = 0.82): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
      reader.onload = (ev) => {
        const img = new window.Image();
        img.onerror = () => reject(new Error("Arquivo de imagem inválido."));
        img.onload = () => {
          const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
          const canvas = document.createElement("canvas");
          canvas.width = Math.round(img.width * scale);
          canvas.height = Math.round(img.height * scale);
          const ctx = canvas.getContext("2d");
          if (!ctx) { reject(new Error("Não foi possível processar a imagem.")); return; }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", quality));
        };
        img.src = ev.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setProcessingImage(true);
    try {
      const dataUrl = await resizeImage(file);
      setForm(f => ({ ...f, imageUrl: dataUrl }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível processar a imagem.");
    } finally {
      setProcessingImage(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)] mb-1 flex items-center gap-3">
            <Star className="h-7 w-7 text-[#C9A84C]" /> Mural dos Sonhos
          </h1>
          <p className="text-[var(--text-muted)] text-sm">Visualize seus objetivos. Manifeste sua realidade.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="btn-gold text-[var(--surface-0)] font-bold">
          <Plus className="h-4 w-4 mr-2" /> Adicionar sonho
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-[var(--text-subtle)]">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-24">
          <Star className="h-16 w-16 text-[#C9A84C] mx-auto mb-4 opacity-30" />
          <p className="text-[var(--text-primary)] text-xl font-serif font-bold mb-2">Seu mural está vazio</p>
          <p className="text-[var(--text-muted)] text-sm mb-6">Adicione fotos e frases dos objetivos que deseja conquistar.</p>
          <Button onClick={() => setOpen(true)} className="btn-gold text-[var(--surface-0)] font-bold">
            <Plus className="h-4 w-4 mr-2" /> Adicionar primeiro sonho
          </Button>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="break-inside-avoid rounded-xl overflow-hidden bg-[var(--surface-2)] border border-[var(--surface-1)] group relative card-depth">
              <img
                src={item.imageUrl}
                alt={item.quote ?? "Sonho"}
                className="w-full object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              {item.quote && (
                <div className="p-4 bg-gradient-to-t from-[var(--surface-0)] to-transparent absolute bottom-0 left-0 right-0">
                  <p className="text-[var(--text-primary)] text-sm font-serif italic leading-relaxed">"{item.quote}"</p>
                </div>
              )}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 rounded-lg bg-[var(--surface-0)]/80 text-[#E53E3E] hover:bg-[#E53E3E] hover:text-white transition-colors backdrop-blur-sm"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[var(--text-primary)]">Adicionar ao Mural</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[var(--text-subtle)] mb-2 block">Imagem</label>
              <div
                className="border-2 border-dashed border-[var(--surface-2)] rounded-xl p-6 text-center cursor-pointer hover:border-[#C9A84C]/40 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {processingImage ? (
                  <p className="text-sm text-[var(--text-subtle)] py-6">Processando imagem...</p>
                ) : form.imageUrl ? (
                  <img src={form.imageUrl} alt="Preview" className="max-h-40 mx-auto rounded-lg object-cover" />
                ) : (
                  <div>
                    <Image className="h-10 w-10 text-[var(--text-subtle)] mx-auto mb-2" />
                    <p className="text-sm text-[var(--text-subtle)]">Clique para selecionar uma foto</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <p className="text-xs text-[var(--text-subtle)] mt-1">Ou cole uma URL:</p>
              <Input
                value={form.imageUrl.startsWith("data:") ? "" : form.imageUrl}
                onChange={(e) => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://..."
                className="mt-1 bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)] h-9 text-sm focus-visible:ring-[#C9A84C]"
              />
            </div>
            <div>
              <label className="text-xs text-[var(--text-subtle)] mb-2 block">Frase motivacional (opcional)</label>
              <Textarea
                value={form.quote}
                onChange={(e) => setForm(f => ({ ...f, quote: e.target.value }))}
                placeholder='"Tudo que a mente pode conceber e acreditar, ela pode conquistar."'
                className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus-visible:ring-[#C9A84C] resize-none h-20 text-sm"
              />
            </div>
            {error && <p className="text-xs text-[#E53E3E]">{error}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setOpen(false)} className="text-[var(--text-muted)]">Cancelar</Button>
              <Button onClick={handleCreate} disabled={!form.imageUrl || submitting || processingImage} className="btn-gold text-[var(--surface-0)] font-bold">
                {submitting ? "Enviando..." : "Adicionar"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
