import { useState, useEffect } from "react";
import { useAuth } from "@clerk/react";
import { Plus, Trash2, TrendingUp, TrendingDown, DollarSign, Wallet, PiggyBank, LineChart as LineChartIcon, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface FinancialEntry { id: string; type: string; amount: number; description: string; category: string; date: string; }
interface Summary { income: number; expense: number; balance: number; }
interface Account { id: string; name: string; type: string; balance: number; }
interface FinGoal { id: string; name: string; targetAmount: number; currentAmount: number; deadline: string | null; }

const CATEGORIES = ["Alimentação", "Transporte", "Moradia", "Saúde", "Educação", "Lazer", "Trabalho", "Investimentos", "Outros"];
const COLORS: Record<string, string> = { Alimentação: "#ED8936", Transporte: "#3B82F6", Moradia: "#8B5CF6", Saúde: "#38A169", Educação: "#C9A84C", Lazer: "#EC4899", Trabalho: "#6B7A8D", Investimentos: "#0EA5E9", Outros: "#6B7280" };

export default function Financas() {
  const { getToken } = useAuth();
  const [entries, setEntries] = useState<FinancialEntry[]>([]);
  const [summary, setSummary] = useState<Summary>({ income: 0, expense: 0, balance: 0 });
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ type: "expense", amount: "", description: "", category: "Outros", date: new Date().toISOString().split("T")[0] });

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountForm, setAccountForm] = useState({ name: "", type: "caixa", balance: "" });

  const [finGoals, setFinGoals] = useState<FinGoal[]>([]);
  const [goalForm, setGoalForm] = useState({ name: "", targetAmount: "", deadline: "" });

  const authFetch = async (path: string, opts?: RequestInit) => {
    const token = await getToken();
    const res = await fetch(path, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, ...opts });
    return res.json();
  };

  const load = async () => {
    setLoading(true);
    const [e, s, a, g] = await Promise.all([
      authFetch("/api/finances"),
      authFetch("/api/finances/summary"),
      authFetch("/api/finances/accounts"),
      authFetch("/api/finances/goals"),
    ]);
    setEntries(Array.isArray(e) ? e : []);
    setSummary(s);
    setAccounts(Array.isArray(a) ? a : []);
    setFinGoals(Array.isArray(g) ? g : []);
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

  const addAccount = async () => {
    if (!accountForm.name.trim()) return;
    const data = await authFetch("/api/finances/accounts", {
      method: "POST",
      body: JSON.stringify({ name: accountForm.name, type: accountForm.type, balance: parseFloat(accountForm.balance) || 0 }),
    });
    setAccounts(prev => [...prev, data]);
    setAccountForm({ name: "", type: "caixa", balance: "" });
  };

  const removeAccount = async (id: string) => {
    await authFetch(`/api/finances/accounts/${id}`, { method: "DELETE" });
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  const addFinGoal = async () => {
    if (!goalForm.name.trim() || !goalForm.targetAmount) return;
    const data = await authFetch("/api/finances/goals", {
      method: "POST",
      body: JSON.stringify({ name: goalForm.name, targetAmount: parseFloat(goalForm.targetAmount), deadline: goalForm.deadline || undefined }),
    });
    setFinGoals(prev => [...prev, data]);
    setGoalForm({ name: "", targetAmount: "", deadline: "" });
  };

  const updateFinGoalProgress = async (id: string, currentAmount: number) => {
    const data = await authFetch(`/api/finances/goals/${id}`, { method: "PATCH", body: JSON.stringify({ currentAmount }) });
    setFinGoals(prev => prev.map(g => g.id === id ? data : g));
  };

  const removeFinGoal = async (id: string) => {
    await authFetch(`/api/finances/goals/${id}`, { method: "DELETE" });
    setFinGoals(prev => prev.filter(g => g.id !== id));
  };

  const byCategory = entries.reduce<Record<string, number>>((acc, e) => {
    if (e.type === "expense") acc[e.category] = (acc[e.category] ?? 0) + e.amount;
    return acc;
  }, {});
  const pieData = Object.entries(byCategory).map(([name, value]) => ({ name, value }));

  const caixas = accounts.filter(a => a.type === "caixa");
  const investimentos = accounts.filter(a => a.type === "investimento");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)] mb-1">Finanças</h1>
          <p className="text-[var(--text-muted)] text-sm">Controle de entradas e saídas</p>
        </div>
        <Button onClick={() => setOpen(true)} className="btn-gold text-[var(--surface-0)] font-bold">
          <Plus className="h-4 w-4 mr-2" /> Novo lançamento
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[var(--surface-2)] rounded-xl p-5 border border-[var(--surface-1)] card-depth">
          <div className="flex items-center gap-2 mb-2 text-[#38A169]"><TrendingUp className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-wider">Entradas</span></div>
          <p className="text-2xl font-bold font-mono text-[#38A169]">R$ {summary.income.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className="bg-[var(--surface-2)] rounded-xl p-5 border border-[var(--surface-1)] card-depth">
          <div className="flex items-center gap-2 mb-2 text-[#E53E3E]"><TrendingDown className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-wider">Saídas</span></div>
          <p className="text-2xl font-bold font-mono text-[#E53E3E]">R$ {summary.expense.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
        </div>
        <div className={`bg-[var(--surface-2)] rounded-xl p-5 border card-depth ${summary.balance >= 0 ? "border-[#38A169]/40" : "border-[#E53E3E]/40"}`}>
          <div className="flex items-center gap-2 mb-2 text-[#C9A84C]"><Wallet className="h-5 w-5" /><span className="text-xs font-semibold uppercase tracking-wider">Balanço</span></div>
          <p className={`text-2xl font-bold font-mono ${summary.balance >= 0 ? "text-[#38A169]" : "text-[#E53E3E]"}`}>
            {summary.balance >= 0 ? "+" : ""}R$ {summary.balance.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* By category chart (real pie chart) */}
        <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)] card-depth">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4">Gastos por categoria</h3>
          {pieData.length === 0 ? (
            <p className="text-center text-[var(--text-subtle)] text-sm py-16">Sem gastos registrados ainda.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={COLORS[entry.name] ?? "#6B7280"} stroke="#1A2B42" />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ backgroundColor: "#162236", border: "1px solid #1A2B42", borderRadius: 8, color: "#F0EBE3" }}
                  formatter={(v: number) => `R$ ${v.toFixed(2)}`}
                />
                <Legend wrapperStyle={{ fontSize: 12, color: "#A89880" }} />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Recent entries */}
        <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)] card-depth">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest mb-4">Lançamentos recentes</h3>
          {loading ? (
            <p className="text-center text-[var(--text-subtle)] text-sm py-8">Carregando...</p>
          ) : entries.length === 0 ? (
            <p className="text-center text-[var(--text-subtle)] text-sm py-8">Nenhum lançamento ainda.</p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {entries.map(entry => (
                <div key={entry.id} className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--surface-1)] group">
                  <div className={`h-2 w-2 rounded-full shrink-0 ${entry.type === "income" ? "bg-[#38A169]" : "bg-[#E53E3E]"}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-[var(--text-primary)] truncate">{entry.description}</p>
                    <p className="text-xs text-[var(--text-subtle)]">{entry.category} · {entry.date ? format(new Date(entry.date), "d MMM", { locale: ptBR }) : ""}</p>
                  </div>
                  <span className={`text-sm font-mono font-bold shrink-0 ${entry.type === "income" ? "text-[#38A169]" : "text-[#E53E3E]"}`}>
                    {entry.type === "income" ? "+" : "-"}R$ {entry.amount.toFixed(2)}
                  </span>
                  <button onClick={() => handleDelete(entry.id, entry)} className="opacity-0 group-hover:opacity-100 p-1 text-[var(--text-subtle)] hover:text-[#E53E3E] transition-all">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Caixas e investimentos */}
        <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)] card-depth space-y-4">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
            <PiggyBank className="h-3.5 w-3.5" /> Caixas e investimentos
          </h3>
          <div className="space-y-2">
            {accounts.length === 0 ? (
              <p className="text-sm text-[var(--text-subtle)]">Nenhuma conta cadastrada.</p>
            ) : (
              <>
                {caixas.length > 0 && (
                  <div>
                    <p className="text-xs text-[var(--text-subtle)] mb-1 flex items-center gap-1"><Wallet className="h-3 w-3" /> Caixas</p>
                    {caixas.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-1)] text-sm group mb-1">
                        <span className="text-[var(--text-primary)]">{a.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#38A169] font-mono font-bold">R$ {a.balance.toFixed(2)}</span>
                          <button onClick={() => removeAccount(a.id)} className="opacity-0 group-hover:opacity-100 text-[var(--text-subtle)] hover:text-[#E53E3E]"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {investimentos.length > 0 && (
                  <div>
                    <p className="text-xs text-[var(--text-subtle)] mb-1 mt-2 flex items-center gap-1"><LineChartIcon className="h-3 w-3" /> Investimentos</p>
                    {investimentos.map(a => (
                      <div key={a.id} className="flex items-center justify-between p-2 rounded-lg bg-[var(--surface-1)] text-sm group mb-1">
                        <span className="text-[var(--text-primary)]">{a.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-[#0EA5E9] font-mono font-bold">R$ {a.balance.toFixed(2)}</span>
                          <button onClick={() => removeAccount(a.id)} className="opacity-0 group-hover:opacity-100 text-[var(--text-subtle)] hover:text-[#E53E3E]"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2 flex-wrap pt-2 border-t border-[var(--surface-1)]">
            <Input value={accountForm.name} onChange={(e) => setAccountForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome" className="flex-1 bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] h-9 text-sm min-w-24" />
            <Select value={accountForm.type} onValueChange={(v) => setAccountForm(f => ({ ...f, type: v }))}>
              <SelectTrigger className="w-32 bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] h-9 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[var(--surface-1)] border-[var(--surface-2)]">
                <SelectItem value="caixa">Caixa</SelectItem>
                <SelectItem value="investimento">Investimento</SelectItem>
              </SelectContent>
            </Select>
            <Input value={accountForm.balance} onChange={(e) => setAccountForm(f => ({ ...f, balance: e.target.value }))} placeholder="Saldo" type="number" className="w-24 bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] h-9 text-sm" />
            <Button onClick={addAccount} className="btn-gold text-[var(--surface-0)] font-bold h-9 px-3"><Plus className="h-4 w-4" /></Button>
          </div>
        </div>

        {/* Metas financeiras */}
        <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)] card-depth space-y-4">
          <h3 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
            <Target className="h-3.5 w-3.5" /> Metas financeiras
          </h3>
          <div className="space-y-2">
            {finGoals.length === 0 ? (
              <p className="text-sm text-[var(--text-subtle)]">Nenhuma meta financeira ainda.</p>
            ) : (
              finGoals.map(g => {
                const pct = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
                return (
                  <div key={g.id} className="p-2.5 rounded-lg bg-[var(--surface-1)] group">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-[var(--text-primary)]">{g.name}</span>
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          value={g.currentAmount}
                          onChange={(e) => updateFinGoalProgress(g.id, parseFloat(e.target.value) || 0)}
                          className="w-20 h-6 text-xs bg-[var(--surface-0)] border-[var(--surface-2)] text-[var(--text-primary)] px-1"
                        />
                        <span className="text-xs text-[var(--text-subtle)]">/ R$ {g.targetAmount.toFixed(0)}</span>
                        <button onClick={() => removeFinGoal(g.id)} className="opacity-0 group-hover:opacity-100 text-[var(--text-subtle)] hover:text-[#E53E3E]"><Trash2 className="h-3 w-3" /></button>
                      </div>
                    </div>
                    <div className="h-1.5 rounded-full bg-[var(--surface-0)] overflow-hidden">
                      <div className="h-full rounded-full bg-[#C9A84C]" style={{ width: `${pct}%` }} />
                    </div>
                    {g.deadline && <p className="text-xs text-[var(--text-subtle)] mt-1">Prazo: {format(new Date(g.deadline), "d MMM yyyy", { locale: ptBR })}</p>}
                  </div>
                );
              })
            )}
          </div>
          <div className="flex gap-2 flex-wrap pt-2 border-t border-[var(--surface-1)]">
            <Input value={goalForm.name} onChange={(e) => setGoalForm(f => ({ ...f, name: e.target.value }))} placeholder="Nome da meta" className="flex-1 bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] h-9 text-sm min-w-24" />
            <Input value={goalForm.targetAmount} onChange={(e) => setGoalForm(f => ({ ...f, targetAmount: e.target.value }))} placeholder="Valor alvo" type="number" className="w-24 bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] h-9 text-sm" />
            <Input value={goalForm.deadline} onChange={(e) => setGoalForm(f => ({ ...f, deadline: e.target.value }))} type="date" className="w-36 bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)] h-9 text-sm" />
            <Button onClick={addFinGoal} className="btn-gold text-[var(--surface-0)] font-bold h-9 px-3"><Plus className="h-4 w-4" /></Button>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-[var(--surface-1)] border-[var(--surface-2)] text-[var(--text-primary)]">
          <DialogHeader><DialogTitle className="font-serif text-[var(--text-primary)]">Novo lançamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex gap-2">
              <button onClick={() => setForm(f => ({ ...f, type: "income" }))} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${form.type === "income" ? "bg-[#38A169]/20 border-[#38A169] text-[#38A169]" : "border-[var(--surface-2)] text-[var(--text-subtle)]"}`}>
                + Entrada
              </button>
              <button onClick={() => setForm(f => ({ ...f, type: "expense" }))} className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${form.type === "expense" ? "bg-[#E53E3E]/20 border-[#E53E3E] text-[#E53E3E]" : "border-[var(--surface-2)] text-[var(--text-subtle)]"}`}>
                - Saída
              </button>
            </div>
            <Input value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Descrição" className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)] focus-visible:ring-[#C9A84C]" />
            <Input value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="Valor (R$)" type="number" className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)] focus-visible:ring-[#C9A84C]" />
            <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
              <SelectTrigger className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)]"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[var(--surface-2)] border-[var(--surface-2)]">
                {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input value={form.date} onChange={(e) => setForm(f => ({ ...f, date: e.target.value }))} type="date" className="bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)] focus-visible:ring-[#C9A84C]" />
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setOpen(false)} className="text-[var(--text-muted)]">Cancelar</Button>
              <Button onClick={handleCreate} disabled={!form.amount || !form.description} className="btn-gold text-[var(--surface-0)] font-bold">Salvar</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
