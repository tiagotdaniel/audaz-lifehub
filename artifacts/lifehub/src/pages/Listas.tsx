import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { Plus, Trash2, Check, RotateCcw, ChevronDown, ChevronUp, DollarSign, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ListItem { id: string; title: string; description?: string; price?: number; checked: boolean; }
interface CheckList { id: string; name: string; description?: string; color: string; resetSchedule: string; items: ListItem[]; }

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
  const [newItemInputs, setNewItemInputs] = useState<Record<string, { title: string; price: string }>>({});
  const [form, setForm] = useState({ name: "", description: "", color: "#C9A84C", resetSchedule: "none" });

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
      body: JSON.stringify({ title: inp.title, price: inp.price ? parseFloat(inp.price) : undefined }),
    });
    setLists(prev => prev.map(l => l.id === listId ? { ...l, items: [...l.items, data] } : l));
    setNewItemInputs(prev => ({ ...prev, [listId]: { title: "", price: "" } }));
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

  const toggle = (id: string) => setExpanded(prev => {
    const next = new Set(prev);
    next.has(id) ? next.delete(id) : next.add(id);
    return next;
  });

  if (loading) return <div className="text-center py-20 text-[#6B7A8D]">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#F0EBE3] mb-1">Listas</h1>
          <p className="text-[#A89880] text-sm">{lists.length} lista{lists.length !== 1 ? "s" : ""}</p>
        </div>
        <Button onClick={() => setNewListOpen(true)} className="btn-gold text-[#0D1B2A] font-bold">
          <Plus className="h-4 w-4 mr-2" /> Nova lista
        </Button>
      </div>

      {lists.length === 0 ? (
        <div className="text-center py-20">
          <List className="h-12 w-12 text-[#C9A84C] mx-auto mb-3 opacity-40" />
          <p className="text-[#6B7A8D]">Nenhuma lista ainda. Crie a primeira!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {lists.map(list => {
            const isExpanded = expanded.has(list.id);
            const totalPrice = list.items.reduce((s, i) => s + (i.price ?? 0), 0);
            const checkedPrice = list.items.filter(i => i.checked).reduce((s, i) => s + (i.price ?? 0), 0);
            const openPrice = totalPrice - checkedPrice;

            return (
              <div key={list.id} className="bg-[#1A2B42] rounded-xl border overflow-hidden" style={{ borderColor: list.color + "40" }}>
                {/* Header */}
                <div className="flex items-center gap-3 p-4 cursor-pointer" onClick={() => toggle(list.id)}>
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: list.color }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-[#F0EBE3]">{list.name}</h3>
                      <span className="text-xs text-[#6B7A8D]">{list.items.filter(i => i.checked).length}/{list.items.length}</span>
                    </div>
                    {totalPrice > 0 && (
                      <div className="flex items-center gap-3 text-xs mt-0.5">
                        <span className="text-[#A89880]">Total: <span className="text-[#C9A84C] font-mono font-bold">R$ {totalPrice.toFixed(2)}</span></span>
                        <span className="text-[#6B7A8D]">Aberto: <span className="text-[#ED8936] font-mono">R$ {openPrice.toFixed(2)}</span></span>
                        <span className="text-[#6B7A8D]">Concluído: <span className="text-[#38A169] font-mono">R$ {checkedPrice.toFixed(2)}</span></span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {list.resetSchedule !== "none" && (
                      <button onClick={(e) => { e.stopPropagation(); resetList(list.id); }} className="p-1.5 rounded-lg text-[#6B7A8D] hover:text-[#C9A84C] hover:bg-[#162236] transition-colors" title="Resetar lista">
                        <RotateCcw className="h-3.5 w-3.5" />
                      </button>
                    )}
                    <button onClick={(e) => { e.stopPropagation(); deleteList(list.id); }} className="p-1.5 rounded-lg text-[#6B7A8D] hover:text-[#E53E3E] hover:bg-[#162236] transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-[#6B7A8D]" /> : <ChevronDown className="h-4 w-4 text-[#6B7A8D]" />}
                  </div>
                </div>

                {isExpanded && (
                  <div className="border-t border-[#162236] p-4 space-y-3">
                    {list.items.map(item => (
                      <div key={item.id} className="flex items-center gap-3 group">
                        <button
                          onClick={() => toggleItem(list.id, item.id, !item.checked)}
                          className={`h-5 w-5 rounded border-2 flex items-center justify-center shrink-0 transition-all ${item.checked ? "border-[#38A169] bg-[#38A169]" : "border-[#6B7A8D] hover:border-[#C9A84C]"}`}
                        >
                          {item.checked && <Check className="h-3 w-3 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${item.checked ? "line-through text-[#6B7A8D]" : "text-[#F0EBE3]"}`}>{item.title}</p>
                          {item.description && <p className="text-xs text-[#6B7A8D]">{item.description}</p>}
                        </div>
                        {item.price && (
                          <span className={`text-xs font-mono font-bold ${item.checked ? "text-[#38A169] line-through" : "text-[#C9A84C]"}`}>
                            R$ {item.price.toFixed(2)}
                          </span>
                        )}
                        <button onClick={() => deleteItem(list.id, item.id)} className="opacity-0 group-hover:opacity-100 p-1 rounded text-[#6B7A8D] hover:text-[#E53E3E] transition-all">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}

                    {/* Add item */}
                    <div className="flex gap-2 mt-3">
                      <Input
                        value={newItemInputs[list.id]?.title ?? ""}
                        onChange={(e) => setNewItemInputs(prev => ({ ...prev, [list.id]: { ...prev[list.id], title: e.target.value } }))}
                        onKeyDown={(e) => e.key === "Enter" && addItem(list.id)}
                        placeholder="Novo item..."
                        className="flex-1 bg-[#162236] border-[#1A2B42] text-[#F0EBE3] placeholder:text-[#6B7A8D] h-9 text-sm focus-visible:ring-[#C9A84C]"
                      />
                      <Input
                        value={newItemInputs[list.id]?.price ?? ""}
                        onChange={(e) => setNewItemInputs(prev => ({ ...prev, [list.id]: { ...prev[list.id], price: e.target.value } }))}
                        placeholder="R$"
                        className="w-20 bg-[#162236] border-[#1A2B42] text-[#F0EBE3] placeholder:text-[#6B7A8D] h-9 text-sm focus-visible:ring-[#C9A84C]"
                        type="number"
                      />
                      <Button onClick={() => addItem(list.id)} size="sm" className="btn-gold text-[#0D1B2A] h-9 px-3">
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={newListOpen} onOpenChange={setNewListOpen}>
        <DialogContent className="bg-[#162236] border-[#1A2B42] text-[#F0EBE3]">
          <DialogHeader>
            <DialogTitle className="font-serif text-[#F0EBE3]">Nova Lista</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome da lista" className="bg-[#1A2B42] border-[#1A2B42] text-[#F0EBE3] focus-visible:ring-[#C9A84C]" />
            <Input value={form.description ?? ""} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição (opcional)" className="bg-[#1A2B42] border-[#1A2B42] text-[#F0EBE3] focus-visible:ring-[#C9A84C]" />
            <div>
              <label className="text-xs text-[#6B7A8D] mb-2 block">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({ ...f, color: c }))} className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? "ring-2 ring-offset-2 ring-offset-[#162236] scale-110" : "opacity-70 hover:opacity-100"}`} style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs text-[#6B7A8D] mb-2 block">Reset automático</label>
              <Select value={form.resetSchedule} onValueChange={v => setForm(f => ({ ...f, resetSchedule: v }))}>
                <SelectTrigger className="bg-[#1A2B42] border-[#1A2B42] text-[#F0EBE3]"><SelectValue /></SelectTrigger>
                <SelectContent className="bg-[#1A2B42] border-[#1A2B42]">
                  {RESET_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setNewListOpen(false)} className="text-[#A89880]">Cancelar</Button>
              <Button onClick={createList} disabled={!form.name.trim()} className="btn-gold text-[#0D1B2A] font-bold">Criar lista</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
