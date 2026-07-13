import { useState, useEffect } from "react";
import { useGetMe, useUpdateMe, getGetMeQueryKey, getGetProductivityStatsQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser, useClerk } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { LogOut, Save, Chrome, Globe, QrCode, Bell, Settings2, Moon, Sun, Monitor, Users, Trash2, Shield, Eye, UserCog, Gauge } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/context/ThemeContext";
import { useAuth } from "@clerk/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProductivityQuestionnaireModal, { type ProductivityProfile } from "@/components/ProductivityQuestionnaireModal";

const THEME_OPTIONS = [
  { key: "dark" as const, label: "Noturno", icon: Moon },
  { key: "light" as const, label: "Diário", icon: Sun },
  { key: "auto" as const, label: "Automático", icon: Monitor },
];

const REMINDER_TIMINGS = [
  { key: "5min", label: "5 minutos" },
  { key: "10min", label: "10 minutos" },
  { key: "25min", label: "25 minutos" },
  { key: "30min", label: "30 minutos" },
  { key: "1h", label: "1 hora" },
  { key: "2h", label: "2 horas" },
  { key: "5h", label: "5 horas" },
  { key: "1d", label: "1 dia antes" },
];

const NOTIF_EVENTS = [
  { key: "task_created", label: "Nova tarefa adicionada" },
  { key: "task_updated", label: "Tarefa atualizada" },
  { key: "task_overdue", label: "Tarefa atrasada" },
  { key: "task_due_soon", label: "Tarefa próxima do prazo" },
  { key: "task_done", label: "Tarefa concluída" },
  { key: "mention", label: "Menção em tarefa (@)" },
];

const NOTIF_CHANNELS = [
  { key: "push", label: "Push" },
  { key: "email", label: "E-mail" },
  { key: "whatsapp", label: "WhatsApp" },
];

const PLANS = [
  { name: "Gratuito", price: "R$ 0/mês", desc: "Uso pessoal, até 50 tarefas ativas", current: true, memberLimit: 1 },
  { name: "Profissional", price: "R$ 29/mês", desc: "Tarefas ilimitadas, até 4 membros, integrações Google", current: false, memberLimit: 4 },
  { name: "Corporativo", price: "R$ 79/mês", desc: "Até 10 membros, relatórios avançados, suporte prioritário", current: false, memberLimit: 10 },
  { name: "Personalizado", price: "Sob consulta", desc: "Membros ilimitados, suporte 24/7", current: false, memberLimit: Infinity },
];

interface WorkspaceMember { id: string; email: string; role: string; status: string; }

const ROLE_INFO: Record<string, { label: string; icon: typeof Shield; desc: string; color: string }> = {
  admin: { label: "Administrador", icon: Shield, desc: "Acesso total: gerencia membros, dados e cobrança", color: "#E53E3E" },
  member: { label: "Membro", icon: UserCog, desc: "Cria e edita tarefas, projetos e demais dados", color: "#C9A84C" },
  guest: { label: "Convidado", icon: Eye, desc: "Visualiza e comenta, sem editar", color: "#3B82F6" },
};

export default function Configuracoes() {
  const qc = useQueryClient();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { data: me } = useGetMe();
  const updateMe = useUpdateMe();
  const { theme, setTheme } = useTheme();
  const { getToken } = useAuth();

  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [memberError, setMemberError] = useState<string | null>(null);
  const [productivityProfile, setProductivityProfile] = useState<ProductivityProfile | null>(null);
  const [showQuestionnaire, setShowQuestionnaire] = useState(false);
  const currentPlan = PLANS.find(p => p.current) ?? PLANS[0]!;

  useEffect(() => {
    (async () => {
      const token = await getToken();
      const res = await fetch("/api/productivity-profile", { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setProductivityProfile(data);
    })();
  }, [getToken]);

  const memberFetch = async (path: string, opts?: RequestInit) => {
    const token = await getToken();
    const res = await fetch(path, { headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, ...opts });
    if (!res.ok) {
      const body = await res.json().catch(() => ({ error: `Erro ${res.status}` }));
      throw new Error(body.error ?? `Erro ${res.status}`);
    }
    return res.json();
  };

  useEffect(() => {
    memberFetch("/api/members").then(setMembers).catch(() => {});
  }, []);

  const inviteMember = async () => {
    if (!inviteEmail.trim()) return;
    setMemberError(null);
    try {
      const data = await memberFetch("/api/members", { method: "POST", body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }) });
      setMembers(prev => [...prev, data]);
      setInviteEmail("");
    } catch (e) {
      setMemberError(e instanceof Error ? e.message : "Não foi possível convidar.");
    }
  };

  const updateMemberRole = async (id: string, role: string) => {
    const data = await memberFetch(`/api/members/${id}`, { method: "PATCH", body: JSON.stringify({ role }) });
    setMembers(prev => prev.map(m => m.id === id ? data : m));
  };

  const removeMember = async (id: string) => {
    await memberFetch(`/api/members/${id}`, { method: "DELETE" });
    setMembers(prev => prev.filter(m => m.id !== id));
  };

  const seatsUsed = members.length + 1; // +1 for the workspace owner
  const atMemberLimit = seatsUsed >= currentPlan.memberLimit;

  const [whatsapp, setWhatsapp] = useState("");
  const [notifPush, setNotifPush] = useState(true);
  const [notifWhatsapp, setNotifWhatsapp] = useState(false);
  const [reminderTimings, setReminderTimings] = useState<string[]>(["30min"]);
  const [notifGrid, setNotifGrid] = useState<Record<string, Record<string, boolean>>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (me) {
      setWhatsapp(me.whatsappNumber ?? "");
      const prefs = me.notifPrefs as Record<string, unknown> | null;
      if (prefs) {
        setNotifPush((prefs.push as boolean) ?? true);
        setNotifWhatsapp((prefs.whatsapp as boolean) ?? false);
        if (prefs.reminderTimings) setReminderTimings(prefs.reminderTimings as string[]);
        if (prefs.notifGrid) setNotifGrid(prefs.notifGrid as Record<string, Record<string, boolean>>);
      }
    }
  }, [me]);

  const toggleReminder = (key: string) => {
    setReminderTimings(prev =>
      prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
    );
  };

  const toggleNotifGrid = (eventKey: string, channelKey: string) => {
    setNotifGrid(prev => ({
      ...prev,
      [eventKey]: { ...(prev[eventKey] || {}), [channelKey]: !(prev[eventKey]?.[channelKey] ?? false) },
    }));
  };

  const handleSave = () => {
    updateMe.mutate({
      data: {
        whatsappNumber: whatsapp || undefined,
        notifPrefs: {
          push: notifPush,
          whatsapp: notifWhatsapp,
          reminderTimings,
          notifGrid,
        },
      },
    }, {
      onSuccess: () => {
        qc.invalidateQueries({ queryKey: getGetMeQueryKey() });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      },
    });
  };

  return (
    <div className="space-y-8 max-w-2xl">
      <div>
        <h1 className="text-3xl font-serif font-bold text-[var(--text-primary)] mb-1">Configurações</h1>
        <p className="text-[var(--text-muted)] text-sm">Gerencie sua conta e preferências</p>
      </div>

      {/* Perfil */}
      <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)] space-y-6">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
          <Settings2 className="h-3.5 w-3.5" />
          Perfil
        </h2>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback className="bg-[var(--surface-1)] text-[#C9A84C] text-xl font-bold">
              {user?.firstName?.[0] ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[var(--text-primary)] font-semibold">{user?.fullName}</p>
            <p className="text-sm text-[var(--text-subtle)]">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
      </div>

      {/* Aparência */}
      <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)] space-y-4">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
          <Moon className="h-3.5 w-3.5" />
          Aparência
        </h2>
        <p className="text-xs text-[var(--text-subtle)]">Escolha o visual do app: noturno, diário, ou automático com base no seu dispositivo.</p>
        <div className="grid grid-cols-3 gap-3">
          {THEME_OPTIONS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTheme(key)}
              className={`flex flex-col items-center gap-2 py-4 rounded-lg border transition-all ${
                theme === key
                  ? "border-[#C9A84C] bg-[#C9A84C]/10 text-[#C9A84C]"
                  : "border-[var(--surface-1)] bg-[var(--surface-0)] text-[var(--text-muted)] hover:border-[#C9A84C]/30"
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Perfil de produtividade */}
      <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)] space-y-4">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
          <Gauge className="h-3.5 w-3.5" />
          Perfil de produtividade
        </h2>
        <p className="text-xs text-[var(--text-subtle)]">
          Usamos suas respostas para estimar quanto tempo o Audaz LifeHub está economizando no seu dia a dia.
        </p>
        {productivityProfile ? (
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-[var(--text-subtle)] text-xs">Horas de trabalho/dia</p>
              <p className="text-[var(--text-primary)] font-medium">{productivityProfile.dailyWorkHours}h</p>
            </div>
            <div>
              <p className="text-[var(--text-subtle)] text-xs">Tarefas/dia estimadas</p>
              <p className="text-[var(--text-primary)] font-medium">{productivityProfile.tasksPerDayEstimate}</p>
            </div>
            <div>
              <p className="text-[var(--text-subtle)] text-xs">Minutos perdidos/dia (antes)</p>
              <p className="text-[var(--text-primary)] font-medium">{productivityProfile.estimatedTimeLostMinutes} min</p>
            </div>
            <div>
              <p className="text-[var(--text-subtle)] text-xs">Produtividade auto-avaliada</p>
              <p className="text-[var(--text-primary)] font-medium">{productivityProfile.productivityRating}/10</p>
            </div>
          </div>
        ) : (
          <p className="text-sm text-[var(--text-muted)]">Você ainda não preencheu o questionário.</p>
        )}
        <button
          onClick={() => setShowQuestionnaire(true)}
          className="px-3 py-2 rounded-lg bg-[var(--surface-0)] border border-[var(--surface-1)] text-[var(--text-muted)] text-sm hover:text-[#C9A84C] hover:border-[#C9A84C]/40 transition-colors"
        >
          {productivityProfile ? "Refazer questionário" : "Preencher agora"}
        </button>
      </div>

      <ProductivityQuestionnaireModal
        open={showQuestionnaire}
        onClose={() => setShowQuestionnaire(false)}
        initial={productivityProfile}
        onSaved={(p) => { setProductivityProfile(p); qc.invalidateQueries({ queryKey: getGetProductivityStatsQueryKey() }); }}
      />

      {/* Lembretes: horário padrão */}
      <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)] space-y-5">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
          <Bell className="h-3.5 w-3.5" />
          Lembretes padrão
        </h2>
        <p className="text-xs text-[var(--text-subtle)]">Quando enviar lembretes antes do prazo? (padrão para novas tarefas)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {REMINDER_TIMINGS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer group">
              <Checkbox
                checked={reminderTimings.includes(key)}
                onCheckedChange={() => toggleReminder(key)}
                className="border-[#C9A84C] data-[state=checked]:bg-[#C9A84C] data-[state=checked]:border-[#C9A84C]"
              />
              <span className={`text-sm transition-colors ${reminderTimings.includes(key) ? "text-[#C9A84C]" : "text-[var(--text-muted)]"}`}>
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Notificações granulares */}
      <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)] space-y-5">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
          <Bell className="h-3.5 w-3.5" />
          Notificações por canal
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-[var(--text-primary)] font-medium">Notificações push</p>
              <p className="text-xs text-[var(--text-subtle)]">Receber lembretes no navegador</p>
            </div>
            <Switch
              checked={notifPush}
              onCheckedChange={setNotifPush}
              className="data-[state=checked]:bg-[#C9A84C]"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-primary)] font-medium">WhatsApp</p>
              <p className="text-xs text-[var(--text-subtle)]">Receber lembretes por WhatsApp</p>
            </div>
            <Switch
              checked={notifWhatsapp}
              onCheckedChange={setNotifWhatsapp}
              className="data-[state=checked]:bg-[#C9A84C]"
            />
          </div>
        </div>

        {notifWhatsapp && (
          <div>
            <label className="text-xs text-[var(--text-subtle)] mb-1.5 block">Número do WhatsApp</label>
            <Input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+55 11 99999-9999"
              className="bg-[var(--surface-0)] border-[var(--surface-2)] text-[var(--text-primary)] placeholder:text-[var(--text-subtle)] focus-visible:ring-[#C9A84C]"
            />
          </div>
        )}

        {/* Grid granular */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left text-[var(--text-subtle)] pb-3 font-medium w-40">Evento</th>
                {NOTIF_CHANNELS.map(ch => (
                  <th key={ch.key} className="text-center text-[var(--text-subtle)] pb-3 font-medium px-3">{ch.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="space-y-2">
              {NOTIF_EVENTS.map(ev => (
                <tr key={ev.key} className="border-t border-[var(--surface-1)]">
                  <td className="py-2.5 text-[var(--text-muted)]">{ev.label}</td>
                  {NOTIF_CHANNELS.map(ch => (
                    <td key={ch.key} className="py-2.5 text-center px-3">
                      <Checkbox
                        checked={notifGrid[ev.key]?.[ch.key] ?? false}
                        onCheckedChange={() => toggleNotifGrid(ev.key, ch.key)}
                        className="border-[#C9A84C] data-[state=checked]:bg-[#C9A84C] data-[state=checked]:border-[#C9A84C]"
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Planos */}
      <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)] space-y-4">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">Planos e assinatura</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`rounded-lg p-4 border transition-all ${
                plan.current
                  ? "border-[#C9A84C] bg-[#C9A84C]/10"
                  : "border-[var(--surface-1)] bg-[var(--surface-0)] hover:border-[#C9A84C]/30"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <p className="font-semibold text-[var(--text-primary)] text-sm">{plan.name}</p>
                {plan.current && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[#C9A84C]/20 text-[#C9A84C] font-medium">Atual</span>
                )}
              </div>
              <p className="text-[#C9A84C] font-bold text-base mb-1">{plan.price}</p>
              <p className="text-xs text-[var(--text-subtle)]">{plan.desc}</p>
              {!plan.current && (
                <button className="mt-3 text-xs text-[#C9A84C] hover:underline font-medium">
                  {plan.name === "Personalizado" ? "Entrar em contato →" : "Fazer upgrade →"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Membros */}
      <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)] space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
            <Users className="h-3.5 w-3.5" />
            Membros
          </h2>
          <span className="text-xs text-[var(--text-subtle)]">
            {seatsUsed}/{currentPlan.memberLimit === Infinity ? "∞" : currentPlan.memberLimit} vagas · plano {currentPlan.name}
          </span>
        </div>

        <div className="space-y-2">
          {(["admin", "member", "guest"] as const).map(r => {
            const info = ROLE_INFO[r]!;
            return (
              <div key={r} className="flex items-center gap-2 text-xs text-[var(--text-subtle)]">
                <info.icon className="h-3.5 w-3.5 shrink-0" style={{ color: info.color }} />
                <span className="font-medium" style={{ color: info.color }}>{info.label}:</span>
                {info.desc}
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          {members.length === 0 ? (
            <p className="text-sm text-[var(--text-subtle)]">Nenhum membro convidado ainda.</p>
          ) : (
            members.map(m => {
              const info = ROLE_INFO[m.role] ?? ROLE_INFO.member!;
              return (
                <div key={m.id} className="flex items-center justify-between p-2.5 rounded-lg bg-[var(--surface-0)]">
                  <div className="min-w-0">
                    <p className="text-sm text-[var(--text-primary)] truncate">{m.email}</p>
                    <p className="text-xs text-[var(--text-subtle)]">{m.status === "pending" ? "Convite pendente" : "Ativo"}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={m.role} onValueChange={(v) => updateMemberRole(m.id, v)}>
                      <SelectTrigger className="w-36 h-8 text-xs bg-[var(--surface-2)] border-[var(--surface-2)] text-[var(--text-primary)]"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-[var(--surface-2)] border-[var(--surface-2)]">
                        <SelectItem value="admin">Administrador</SelectItem>
                        <SelectItem value="member">Membro</SelectItem>
                        <SelectItem value="guest">Convidado</SelectItem>
                      </SelectContent>
                    </Select>
                    <button onClick={() => removeMember(m.id)} className="p-1.5 rounded text-[var(--text-subtle)] hover:text-[#E53E3E] transition-colors">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {memberError && <p className="text-xs text-[#E53E3E]">{memberError}</p>}
        {atMemberLimit ? (
          <p className="text-xs text-[#ED8936]">Limite de membros do plano {currentPlan.name} atingido. Faça upgrade para convidar mais pessoas.</p>
        ) : (
          <div className="flex gap-2 flex-wrap pt-2 border-t border-[var(--surface-1)]">
            <Input
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="E-mail para convidar"
              type="email"
              className="flex-1 min-w-40 bg-[var(--surface-0)] border-[var(--surface-2)] text-[var(--text-primary)] h-9 text-sm"
            />
            <Select value={inviteRole} onValueChange={setInviteRole}>
              <SelectTrigger className="w-36 h-9 text-sm bg-[var(--surface-0)] border-[var(--surface-2)] text-[var(--text-primary)]"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-[var(--surface-2)] border-[var(--surface-2)]">
                <SelectItem value="admin">Administrador</SelectItem>
                <SelectItem value="member">Membro</SelectItem>
                <SelectItem value="guest">Convidado</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={inviteMember} disabled={!inviteEmail.trim()} className="btn-gold text-[var(--surface-0)] font-bold h-9">Convidar</Button>
          </div>
        )}
      </div>

      {/* Extensão de navegador */}
      <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)] space-y-4">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest flex items-center gap-2">
          <Globe className="h-3.5 w-3.5" />
          Extensão de navegador
        </h2>
        <p className="text-sm text-[var(--text-muted)]">
          Adicione tarefas ao Audaz LifeHub diretamente do seu navegador, sem sair da página.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="https://chrome.google.com/webstore/detail/audaz-lifehub"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--surface-0)] border border-[var(--surface-2)] text-[var(--text-primary)] hover:border-[#C9A84C]/30 transition-all text-sm font-medium"
          >
            <Chrome className="h-4 w-4 text-[#C9A84C]" />
            Instalar no Chrome
          </a>
          <a
            href="https://addons.mozilla.org/firefox/addon/audaz-lifehub"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[var(--surface-0)] border border-[var(--surface-2)] text-[var(--text-primary)] hover:border-[#C9A84C]/30 transition-all text-sm font-medium"
          >
            <Globe className="h-4 w-4 text-[#C9A84C]" />
            Instalar no Firefox
          </a>
        </div>
        <div className="flex items-center gap-3 p-3 bg-[var(--surface-0)] rounded-lg border border-[var(--surface-2)]">
          <QrCode className="h-10 w-10 text-[var(--text-subtle)]" />
          <div>
            <p className="text-xs text-[var(--text-muted)] font-medium">QR Code para instalação</p>
            <p className="text-xs text-[var(--text-subtle)]">Aponte a câmera do celular para instalar rapidamente</p>
          </div>
        </div>
      </div>

      {/* Salvar */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateMe.isPending}
          className={`font-bold transition-colors ${saved ? "bg-[#38A169] hover:bg-[#48BB78] text-white" : "bg-[#C9A84C] hover:bg-[#E2C06E] text-[var(--surface-0)]"}`}
        >
          {saved ? (
            "Salvo com sucesso!"
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Salvar preferências
            </>
          )}
        </Button>
      </div>

      {/* Conta */}
      <div className="bg-[var(--surface-2)] rounded-xl p-6 border border-[var(--surface-1)] space-y-4">
        <h2 className="text-xs font-semibold text-[var(--text-muted)] uppercase tracking-widest">Conta</h2>
        <Button
          onClick={() => signOut()}
          variant="outline"
          className="border-[#E53E3E] text-[#E53E3E] bg-transparent hover:bg-[#E53E3E] hover:text-white transition-colors"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sair da conta
        </Button>
      </div>
    </div>
  );
}
