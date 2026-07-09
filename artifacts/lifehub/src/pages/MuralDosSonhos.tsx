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
  const fileRef = useRef<HTMLInputElement>(null);

  const authFetch = async (path: string, opts?: RequestInit) => {
    const token = await getToken();
    const res = await fetch(path, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, ...opts });
    return res.json();
  };

  useEffect(() => {
    authFetch("/api/dream-board").then(d => { setItems(d); setLoading(false); });
  }, []);

  const handleCreate = async () => {
    if (!form.imageUrl) return;
    const data = await authFetch("/api/dream-board", { method: "POST", body: JSON.stringify(form) });
    setItems(prev => [...prev, data]);
    setOpen(false);
    setForm({ imageUrl: "", quote: "" });
  };

  const handleDelete = async (id: string) => {
    await authFetch(`/api/dream-board/${id}`, { method: "DELETE" });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) setForm(f => ({ ...f, imageUrl: ev.target!.result as string }));
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#F0EBE3] mb-1 flex items-center gap-3">
            <Star className="h-7 w-7 text-[#C9A84C]" /> Mural dos Sonhos
          </h1>
          <p className="text-[#A89880] text-sm">Visualize seus objetivos. Manifeste sua realidade.</p>
        </div>
        <Button onClick={() => setOpen(true)} className="btn-gold text-[#0D1B2A] font-bold">
          <Plus className="h-4 w-4 mr-2" /> Adicionar sonho
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-[#6B7A8D]">Carregando...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-24">
          <Star className="h-16 w-16 text-[#C9A84C] mx-auto mb-4 opacity-30" />
          <p className="text-[#F0EBE3] text-xl font-serif font-bold mb-2">Seu mural está vazio</p>
          <p className="text-[#A89880] text-sm mb-6">Adicione fotos e frases dos objetivos que deseja conquistar.</p>
          <Button onClick={() => setOpen(true)} className="btn-gold text-[#0D1B2A] font-bold">
            <Plus className="h-4 w-4 mr-2" /> Adicionar primeiro sonho
          </Button>
        </div>
      ) : (
        <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
          {items.map((item) => (
            <div key={item.id} className="break-inside-avoid rounded-xl overflow-hidden bg-[#1A2B42] border border-[#162236] group relative card-depth">
              <img
                src={item.imageUrl}
                alt={item.quote ?? "Sonho"}
                className="w-full object-cover"
                onError={(e) => (e.currentTarget.style.display = "none")}
              />
              {item.quote && (
                <div className="p-4 bg-gradient-to-t from-[#0D1B2A] to-transparent absolute bottom-0 left-0 right-0">
                  <p className="text-[#F0EBE3] text-sm font-serif italic leading-relaxed">"{item.quote}"</p>
                </div>
              )}
              <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleDelete(item.id)}
                  className="p-2 rounded-lg bg-[#0D1B2A]/80 text-[#E53E3E] hover:bg-[#E53E3E] hover:text-white transition-colors backdrop-blur-sm"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#162236] border-[#1A2B42] text-[#F0EBE3] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#F0EBE3]">Adicionar ao Mural</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[#6B7A8D] mb-2 block">Imagem</label>
              <div
                className="border-2 border-dashed border-[#1A2B42] rounded-xl p-6 text-center cursor-pointer hover:border-[#C9A84C]/40 transition-colors"
                onClick={() => fileRef.current?.click()}
              >
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="Preview" className="max-h-40 mx-auto rounded-lg object-cover" />
                ) : (
                  <div>
                    <Image className="h-10 w-10 text-[#6B7A8D] mx-auto mb-2" />
                    <p className="text-sm text-[#6B7A8D]">Clique para selecionar uma foto</p>
                  </div>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
              <p className="text-xs text-[#6B7A8D] mt-1">Ou cole uma URL:</p>
              <Input
                value={form.imageUrl.startsWith("data:") ? "" : form.imageUrl}
                onChange={(e) => setForm(f => ({ ...f, imageUrl: e.target.value }))}
                placeholder="https://..."
                className="mt-1 bg-[#1A2B42] border-[#1A2B42] text-[#F0EBE3] h-9 text-sm focus-visible:ring-[#C9A84C]"
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7A8D] mb-2 block">Frase motivacional (opcional)</label>
              <Textarea
                value={form.quote}
                onChange={(e) => setForm(f => ({ ...f, quote: e.target.value }))}
                placeholder='"Tudo que a mente pode conceber e acreditar, ela pode conquistar."'
                className="bg-[#1A2B42] border-[#1A2B42] text-[#F0EBE3] placeholder:text-[#6B7A8D] focus-visible:ring-[#C9A84C] resize-none h-20 text-sm"
              />
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setOpen(false)} className="text-[#A89880]">Cancelar</Button>
              <Button onClick={handleCreate} disabled={!form.imageUrl} className="btn-gold text-[#0D1B2A] font-bold">Adicionar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
