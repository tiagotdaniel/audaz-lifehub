import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { Plus, Trash2, Check, RotateCcw, ChevronDown, ChevronUp, DollarSign, List, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface ListItem { id: string; title: string; description?: string; price?: number; checked: boolean; }
interface CheckList { id: string; name: string; description?: string; color: string; resetSchedule: string; deadline?: string | null; items: ListItem[]; }

const RESET_OPTIONS = [
  { value: "none", label: "Sem reset" },
  { value: "daily", label: "Diário" },
  { value: "weekly", label: "Semanal" },
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
];

const COLORS = ["#C9A84C", "#38A169", "#3B82F6", "#E53E3E", "#ED8936", "#8B5CF6", "#EC4899"];

async function apiFetch(path: string, opts?: RequestInit) {
  const res = await fetch(path, { headers: { "Content-Type": "application/json" }, ...opts });
  return res.json();
}

export default function Listas() {
  const { getToken } = useAuth();
  const [lists, setLists] = useState<CheckList[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [newListOpen, setNewListOpen] = useState(false);
  const [newItemInputs, setNewItemInputs] = useState<Record<string, { title: string; description: string; price: string }>>({});
  const [form, setForm] = useState({ name: "", description: "", color: "#C9A84C", resetSchedule: "none" });
  const [settingsListId, setSettingsListId] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState({ color: "#C9A84C", resetSchedule: "none", deadline: "" });

  const authFetch = async (path: string, opts?: RequestInit) => {
    const token = await getToken();
    return apiFetch(path, { ...opts, headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` } });
  };

  const load = async () => {
    setLoading(true);
    const data = await authFetch("/api/lists");
    setLists(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const createList = async () => {
    const data = await authFetch("/api/lists", { method: "POST", body: JSON.stringify(form) });
    setLists(prev => [...prev, data]);
    setNewListOpen(false);
    setForm({ name: "", description: "", color: "#C9A84C", resetSchedule: "none" });
  };

  const deleteList = async (id: string) => {
    await authFetch(`/api/lists/${id}`, { method: "DELETE" });
    setLists(prev => prev.filter(l => l.id !== id));
  };

  const addItem = async (listId: string) => {
    const inp = newItemInputs[listId];
    if (!inp?.title.trim()) return;
    const data = await authFetch(`/api/lists/${listId}/items`, {
      method: "POST",
      body: JSON.stringify({ title: inp.title, description: inp.description || undefined, price: inp.price ? parseFloat(inp.price) : undefined }),
    });
    setLists(prev => prev.map(l => l.id === listId ? { ...l, items: [...l.items, data] } : l));
    setNewItemInputs(prev => ({ ...prev, [listId]: { title: "", description: "", price: "" } }));
  };

  const toggleItem = async (listId: string, itemId: string, checked: boolean) => {
    const data = await authFetch(`/api/lists/${listId}/items/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify({ checked }),
    });
    setLists(prev => prev.map(l => l.id === listId ? { ...l, items: l.items.map(i => i.id === itemId ? data : i) } : l));
  };

  const deleteItem = async (listId: string, itemId: string) => {
    await authFetch(`/api/lists/${listId}/items/${itemId}`, { method: "DELETE" });
    setLists(prev => prev.map(l => l.id === listId ? { ...l, items: l.items.filter(i => i.id !== itemId) } : l));
  };

  const resetList = async (listId: string) => {
    await authFetch(`/api/lists/${listId}/reset`, { method: "POST" });
    setLists(prev => prev.map(l => l.id === listId ? { ...l, items: l.items.map(i => ({ ...i, checked: false })) } : l));
  };

  const openSettings = (list: CheckList) => {
    setSettingsForm({
      color: list.color,
      resetSchedule: list.resetSchedule,
      deadline: list.deadline ? list.deadline.slice(0, 10) : "",
    });
    setSettingsListId(list.id);
  };

  const saveSettings = async () => {
    if (!settingsListId) return;
    const data = await authFetch(`/api/lists/${settingsListId}`, {
      method: "PATCH",
      body: JSON.stringify({
        color: settingsForm.color,
        resetSchedule: settingsForm.resetSchedule,
        deadline: settingsForm.deadline || null,
      }),
    });
    setLists(prev => prev.map(l => l.id === settingsListId ? { ...l, ...data } : l));
    setSettingsListId(null);
  };

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  if (loading) return <div className="text-center py-20 text-[var(--text-subtle)]">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)] mb-1">Listas</h1>
          <p className="text-[var(--text-muted)] text-sm">{lists.length} lista{lists.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setNewListOpen(true)} className="btn-gold text-[var(--surface-0)] font-bold">
          <Plus className="h-4 w-4 mr-2" /> Nova lista
        </Button>
      </div>

      {lists.length === 0 ? (
        <div className="text-center py-20">
          <List className="h-12 w-12 text-[#C9A84C] mx-auto mb-3 opacity-40" />
          <p className="text-[var(--text-subtle)]">Nenhuma lista ainda. Crie a primeira!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lists.map(list => {
            const isExpanded = expanded.has(list.id);
            const totalPrice = list.items.reduce((s, i) => s + (i.price ?? 0), 0);
            const checkedPrice = list.items.filter(i => i.checked).reduce((s, i) => s + (i.price ?? 0), 0);
            const openPrice = totalPrice - checkedPrice;

            return (
              <div key={list.id} className="bg-[var(--surface-2)] rounded-xl border overflow-hidden" style={{ borderColor: list.color + "40" }}>
                {/* Header */}
                <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => toggle(list.id)}>
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: list.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[var(--text-primary)]">{list.name}</h3>
                      <span className="text-xs text-[var(--text-subtle)]">{list.items.filter(i => i.checked).length}/{list.items.length}</span>
                    </div>
                    <div className="flex items-center gap-3 text-xs mt-0.5">
                      {totalPrice > 0 && (
                        <>
                          <span className="text-[var(--text-muted)]">Total: <span className="text-[#C9A84C] font-mono font-bold">R$ {totalPrice.toFixed(2)}</span></span>
                          <span className="text-[var(--text-subtle)]">Aberto: <span className="text-[#ED8936] font-mono">R$ {openPrice.toFixed(2)}</span></span>
                          <span className="text-[var(--text-subtle)]">Concluído: <span className="text-[#38A169] font-mono">R$ {checkedPrice.toFixed(2)}</span></span>
                        </>
                      )}
                      {list.deadline && (
                        <span className="text-[#ED8936]">Prazo: {format(new Date(list.deadline), "d MMM yyyy", { locale: ptBR })}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={(e) => { e.stopPropagation(); openSettings(list); }} className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-[#C9A84C] hover:bg-[var(--surface-1)] transition-colors" title="Configurações da lista">
                      <Settings className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); deleteList(list.id); }} className="p-1.5 rounded-lg text-[var(--text-subtle)] hover:text-[#E53E3E] hover:bg-[var(--surface-1)] transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-[var(--text-subtle)]" /> : <ChevronDown className="h-4 w-4 text-[var(--text-subtle)]" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-[var(--surface-1)] p-4 space-y-3">
                    {list.items.map(item => (
                      <div key={item.id} className="flex items-center gap-3 group">
                        <button
                          onClick={() => toggleItem(list.id, item.id, !item.checked)}
                          className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${item.checked ? "border-[#38A169] bg-[#38A169]" : "border-[var(--text-subtle)] hover:border-[#C9A84C]"}`}
                        >
                          {item.checked && <Check className="h-3 w-3 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${item.checked ? "line-through text-[var(--text-subtle)]" : "text-[var(--text-primary)]"}`}>{item.title}</p>
                          {item.description && <p className="text-xs text-[var(--text-subtle)]">{item.description}</p>}
                        </div>
                        {item.price && (
                          <span className={`text-xs font-mono font-bold ${item.checked ? "text-[#38A169] line-through" : "text-[#C9A84C]"}`}>
                            R$ {item.price.toFixed(2)}
                          </span>
                        )}
                        <button onClick={() => deleteItem(list.id, item.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-[var(--text-subtle)] hover:text-[#E53E3E] transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Add item */}
                    <div className="flex flex-col gap-2 mt-3">
                      <div className="flex gap-2">
                        <Input
                          value={newItemInputs[list.id]?.title ?? ""}
                          onChange={(e) => setNewItemInputs(prev => ({ ...prev, [list.id]: { ...prev[list.id], title: e.target.value, description: prev[list.id]?.description ?? "", price: prev[list.id]?.price ?? "" } }))}
                          onKeyDown={(e) => e.key === "Enter" && addItem(list.id)}
                          placeholder="Novo item..."
                          className="flex-1 bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] h-9 text-sm focus-visible:ring-[#C9A84C]"
                        />
                        <Input
                          value={newItemInputs[list.id]?.price ?? ""}
                          onChange={(e) => setNewItemInputs(prev => ({ ...prev, [list.id]: { ...prev[list.id], price: e.target.value, title: prev[list.id]?.title ?? "", description: prev[list.id]?.description ?? "" } }))}
                          placeholder="R$"
                          className="w-20 bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] h-9 text-sm focus-visible:ring-[#C9A84C]"
                          type="number"
                        />
                        <Button onClick={() => addItem(list.id)} size="sm" className="btn-gold text-[var(--surface-0)] h-9 px-3">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </div>
                      <Input
                        value={newItemInputs[list.id]?.description ?? ""}
                        onChange={(e) => setNewItemInputs(prev => ({ ...prev, [list.id]: { ...prev[list.id], description: e.target.value, title: prev[list.id]?.title ?? "", price: prev[list.id]?.price ?? "" } }))}
                        onKeyDown={(e) => e.key === "Enter" && addItem(list.id)}
                        placeholder="Descrição (opcional)"
                        className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] h-8 text-xs focus-visible:ring-[#C9A84C]"
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={newListOpen} onOpenChange={setNewListOpen}>
        <DialogContent className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)]">
          <DialogHeader>
            <DialogTitle className="font-serif text-[var(--text-primary)]">Nova Lista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome da lista" className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)] focus-visible:ring-[#C9A84C]" />
            <Input value={form.description ?? ""} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição (opcional)" className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)] focus-visible:ring-[#C9A84C]" />
            <div>
              <label className="text-xs text-[var(--text-subtle)] mb-2 block">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? "ring-2 ring-offset-2 ring-offset-[var(--surface-1)] scale-110" : "opacity-70 hover:opacity-100"}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--text-subtle)] mb-2 block">Reset automático</label>
              <Select value={form.resetSchedule} onValueChange={v => setForm(f => ({ ...f, resetSchedule: v }))}>
                <SelectTrigger className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)]"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[var(--surface-2)] border-[var(--surface-2)]">
                  {RESET_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setNewListOpen(false)} className="text-[var(--text-muted)]">Cancelar</Button>
              <Button onClick={createList} disabled={!form.name.trim()} className="btn-gold text-[var(--surface-0)] font-bold">Criar lista</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!settingsListId} onOpenChange={(o) => !o && setSettingsListId(null)}>
        <DialogContent className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)]">
          <DialogHeader>
            <DialogTitle className="font-serif text-[var(--text-primary)] flex items-center gap-2">
              <Settings className="h-4 w-4" /> Configurações da lista
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-xs text-[var(--text-subtle)] mb-2 block">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setSettingsForm(f => ({ ...f, color: c }))} className={`w-7 h-7 rounded-full transition-transform ${settingsForm.color === c ? "ring-2 ring-offset-2 ring-offset-[var(--surface-1)] scale-110" : "opacity-70 hover:opacity-100"}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-[var(--text-subtle)] mb-2 block">Tipo de reset</label>
              <Select value={settingsForm.resetSchedule} onValueChange={v => setSettingsForm(f => ({ ...f, resetSchedule: v }))}>
                <SelectTrigger className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)]"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[var(--surface-2)] border-[var(--surface-2)]">
                  {RESET_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-[var(--text-subtle)] mb-2 block">Prazo</label>
              <Input
                type="date"
                value={settingsForm.deadline}
                onChange={(e) => setSettingsForm(f => ({ ...f, deadline: e.target.value }))}
                className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)] focus-visible:ring-[#C9A84C]"
              />
            </div>
            <button
              onClick={() => settingsListId && resetList(settingsListId)}
              className="w-full flex items-center justify-center gap-2 py-2 rounded-lg border border-[var(--surface-2)] text-[var(--text-muted)] text-sm hover:text-[#C9A84C] hover:border-[#C9A84C]/40 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" /> Resetar lista agora (desmarca todos os itens)
            </button>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setSettingsListId(null)} className="text-[var(--text-muted)]">Cancelar</Button>
              <Button onClick={saveSettings} className="btn-gold text-[var(--surface-0)] font-bold">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
