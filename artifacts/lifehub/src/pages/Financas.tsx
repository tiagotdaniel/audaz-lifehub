import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinancialEntry { id: string; type: string; amount: number; description: string; category: string; date: string; }
interface Summary { income: number; expense: number; balance: number; }

const CATEGORIES = ["Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Lazer", "Trabalho", "Investimentos", "Outros"];
const COLORS: Record<string, string> = { Alimentação: "#ED8936", Transporte: "#3B82F6", Moradia: "#8B5CF6", Saúde: "#38A169", Educação: "#C9A84C", Lazer: "#EC4899", Trabalho: "#6B7A8D", Investimentos: "#0EA5E9", Outros: "#6B7280" };

export default function Financas() {
  const { getToken } = useAuth();
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [summary, setSummary] = useState<Summary>({ income: 0, expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "expense", amount: "", description: "", category: "Outros", date: new Date().toISOString().split("T")[0] });

  const authFetch = async (path: string, opts?: RequestInit) => {
    const token = await getToken();
    const res = await fetch(path, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, ...opts });
    return res.json();
  };

  const load = async () => {
    setLoading(true);
    const [e, s] = await Promise.all([authFetch("/api/finances"), authFetch("/api/finances/summary")]);
    setEntries(e);
    setSummary(s);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.amount || !form.description) return;
    const data = await authFetch("/api/finances", { method: "POST", body: JSON.stringify({ ...form, amount: parseFloat(form.amount) }) });
    setEntries(prev => [data, ...prev]);
    setSummary(prev => ({
      ...prev,
      income: form.type === "income" ? prev.income + parseFloat(form.amount) : prev.income,
      expense: form.type === "expense" ? prev.expense + parseFloat(form.amount) : prev.expense,
      balance: form.type === "income" ? prev.balance + parseFloat(form.amount) : prev.balance - parseFloat(form.amount),
    }));
    setOpen(false);
    setForm({ type: "expense", amount: "", description: "", category: "Outros", date: new Date().toISOString().split("T")[0] });
  };

  const handleDelete = async (id: string, entry: FinancialEntry) => {
    await authFetch(`/api/finances/${id}`, { method: "DELETE" });
    setEntries(prev => prev.filter(e => e.id !== id));
    setSummary(prev => ({
      ...prev,
      income: entry.type === "income" ? prev.income - entry.amount : prev.income,
      expense: entry.type === "expense" ? prev.expense - entry.amount : prev.expense,
      balance: entry.type === "income" ? prev.balance - entry.amount : prev.balance + entry.amount,
    }));
  };

  const byCategory = entries.reduce<Record<string, number>>((acc, e) => {
    if (e.type === "expense") acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});
  const maxCat = Math.max(...Object.values(byCategory), 1);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[#F0EBE3] mb-1">Finanças</h1>
          <p className="text-[#A89880] text-sm">Controle de entradas e saídas</p>
        </div>
        <Button onClick={() => setOpen(true)} className="btn-gold text-[#0D1B2A] font-bold">
          <Plus className="h-4 w-4 mr-2" /> Novo lançamento
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#1A2B42] rounded-xl p-5 border border-[#162236] card-depth">
          <div className="flex items-center gap-2 mb-2 text-[#38A169]"><TrendingUp className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-wider">Entradas</span></div>
          <p className="text-2xl font-bold font-mono text-[#38A169]">R$ {summary.income.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-[#1A2B42] rounded-xl p-5 border border-[#162236] card-depth">
          <div className="flex items-center gap-2 mb-2 text-[#E53E3E]"><TrendingDown className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-wider">Saídas</span></div>
          <p className="text-2xl font-bold font-mono text-[#E53E3E]">R$ {summary.expense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className={`bg-[#1A2B42] rounded-xl p-5 border card-depth ${summary.balance >= 0 ? "border-[#38A169]/40" : "border-[#E53E3E]/40"}`}>
          <div className="flex items-center gap-2 mb-2 text-[#C9A84C]"><Wallet className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-wider">Balanço</span></div>
          <p className={`text-2xl font-bold font-mono ${summary.balance >= 0 ? "text-[#38A169]" : "text-[#E53E3E]"}`}>
            {summary.balance >= 0 ? "+" : ""}R$ {summary.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* By category chart */}
        {Object.keys(byCategory).length > 0 && (
          <div className="bg-[#1A2B42] rounded-xl p-6 border border-[#162236] card-depth">
            <h3 className="text-xs font-semibold text-[#A89880] uppercase tracking-widest mb-4">Gastos por categoria</h3>
            <div className="space-y-3">
              {Object.entries(byCategory).sort((a, b) => b[1] - a[1]).map(([cat, val]) => (
                <div key={cat}>
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-[#F0EBE3]">{cat}</span>
                    <span className="text-sm font-mono text-[#E53E3E]">R$ {val.toFixed(2)}</span>
                  </div>
                  <div className="h-1.5 bg-[#162236] rounded-full overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{ width: `${(val / maxCat) * 100}%`, backgroundColor: COLORS[cat] ?? "#6B7280" }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent entries */}
        <div className="bg-[#1A2B42] rounded-xl p-6 border border-[#162236] card-depth">
          <h3 className="text-xs font-semibold text-[#A89880] uppercase tracking-widest mb-4">Lançamentos recentes</h3>
          {loading ? (
            <p className="text-center text-[#6B7A8D] text-sm py-8">Carregando...</p>
          ) : entries.length === 0 ? (
            <p className="text-center text-[#6B7A8D] text-sm py-8">Nenhum lançamento ainda.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {entries.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[#162236] group">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${entry.type === "income" ? "bg-[#38A169]" : "bg-[#E53E3E]"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[#F0EBE3] truncate">{entry.description}</p>
                    <p className="text-xs text-[#6B7A8D]">{entry.category} · {entry.date ? format(new Date(entry.date), "d MMM", { locale: ptBR }) : ""}</p>
                  </div>
                  <span className={`text-sm font-mono font-bold shrink-0 ${entry.type === "income" ? "text-[#38A169]" : "text-[#E53E3E]"}`}>
                    {entry.type === "income" ? "+" : "-"}R$ {entry.amount.toFixed(2)}
                  </span>
                  <button onClick={() => handleDelete(entry.id, entry)} className="opacity-0 group-hover:opacity-100 p-1 text-[#6B7A8D] hover:text-[#E53E3E] transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[#162236] border-[#1A2B42] text-[#F0EBE3]">
          <DialogHeader><DialogTitle className="font-serif text-[#F0EBE3]">Novo lançamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <button onClick={() => setForm(f => ({ ...f, type: "income" }))} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${form.type === "income" ? "bg-[#38A169]/20 border-[#38A169] text-[#38A169]" : "border-[#1A2B42] text-[#6B7A8D]"}`}>
                + Entrada
              </button>
              <button onClick={() => setForm(f => ({ ...f, type: "expense" }))} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${form.type === "expense" ? "bg-[#E53E3E]/20 border-[#E53E3E] text-[#E53E3E]" : "border-[#1A2B42] text-[#6B7A8D]"}`}>
                - Saída
              </button>
            </div>
            <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição" className="bg-[#1A2B42] border-[#1A2B42] text-[#F0EBE3] focus-visible:ring-[#C9A84C]" />
            <Input value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="Valor (R$)" type="number" className="bg-[#1A2B42] border-[#1A2B42] text-[#F0EBE3] focus-visible:ring-[#C9A84C]" />
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger className="bg-[#1A2B42] border-[#1A2B42] text-[#F0EBE3]"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[#1A2B42] border-[#1A2B42]">
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} type="date" className="bg-[#1A2B42] border-[#1A2B42] text-[#F0EBE3] focus-visible:ring-[#C9A84C]" />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setOpen(false)} className="text-[#A89880]">Cancelar</Button>
              <Button onClick={handleCreate} disabled={!form.amount || !form.description} className="btn-gold text-[#0D1B2A] font-bold">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
