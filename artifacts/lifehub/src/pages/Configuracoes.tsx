import { useState, useEffect } from "react";
import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser, useClerk } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { LogOut, Save, Chrome, Globe, QrCode, Bell, Settings2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

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
  { name: "Gratuito", price: "R$ 0/mês", desc: "Uso pessoal, até 50 tarefas ativas", current: true },
  { name: "Profissional", price: "R$ 29/mês", desc: "Tarefas ilimitadas, até 4 membros, integrações Google", current: false },
  { name: "Corporativo", price: "R$ 79/mês", desc: "Até 10 membros, relatórios avançados, suporte prioritário", current: false },
  { name: "Personalizado", price: "Sob consulta", desc: "Membros ilimitados, suporte 24/7", current: false },
];

export default function Configuracoes() {
  const qc = useQueryClient();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { data: me } = useGetMe();
  const updateMe = useUpdateMe();

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
        <h1 className="text-3xl font-serif font-bold text-[#F0EBE3] mb-1">Configurações</h1>
        <p className="text-[#A89880] text-sm">Gerencie sua conta e preferências</p>
      </div>

      {/* Perfil */}
      <div className="bg-[#1A2B42] rounded-xl p-6 border border-[#162236] space-y-6">
        <h2 className="text-xs font-semibold text-[#A89880] uppercase tracking-widest flex items-center gap-2">
          <Settings2 className="h-3.5 w-3.5" />
          Perfil
        </h2>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback className="bg-[#162236] text-[#C9A84C] text-xl font-bold">
              {user?.firstName?.[0] ?? "?"}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-[#F0EBE3] font-semibold">{user?.fullName}</p>
            <p className="text-sm text-[#6B7A8D]">{user?.primaryEmailAddress?.emailAddress}</p>
          </div>
        </div>
      </div>

      {/* Lembretes: horário padrão */}
      <div className="bg-[#1A2B42] rounded-xl p-6 border border-[#162236] space-y-5">
        <h2 className="text-xs font-semibold text-[#A89880] uppercase tracking-widest flex items-center gap-2">
          <Bell className="h-3.5 w-3.5" />
          Lembretes padrão
        </h2>
        <p className="text-xs text-[#6B7A8D]">Quando enviar lembretes antes do prazo? (padrão para novas tarefas)</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {REMINDER_TIMINGS.map(({ key, label }) => (
            <label key={key} className="flex items-center gap-2 cursor-pointer group">
              <Checkbox
                checked={reminderTimings.includes(key)}
                onCheckedChange={() => toggleReminder(key)}
                className="border-[#C9A84C] data-[state=checked]:bg-[#C9A84C] data-[state=checked]:border-[#C9A84C]"
              />
              <span className={`text-sm transition-colors ${reminderTimings.includes(key) ? "text-[#C9A84C]" : "text-[#A89880]"}`}>
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Notificações granulares */}
      <div className="bg-[#1A2B42] rounded-xl p-6 border border-[#162236] space-y-5">
        <h2 className="text-xs font-semibold text-[#A89880] uppercase tracking-widest flex items-center gap-2">
          <Bell className="h-3.5 w-3.5" />
          Notificações por canal
        </h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-2">
            <div>
              <p className="text-sm text-[#F0EBE3] font-medium">Notificações push</p>
              <p className="text-xs text-[#6B7A8D]">Receber lembretes no navegador</p>
            </div>
            <Switch
              checked={notifPush}
              onCheckedChange={setNotifPush}
              className="data-[state=checked]:bg-[#C9A84C]"
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#F0EBE3] font-medium">WhatsApp</p>
              <p className="text-xs text-[#6B7A8D]">Receber lembretes por WhatsApp</p>
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
            <label className="text-xs text-[#6B7A8D] mb-1.5 block">Número do WhatsApp</label>
            <Input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+55 11 99999-9999"
              className="bg-[#0D1B2A] border-[#1A2B42] text-[#F0EBE3] placeholder:text-[#6B7A8D] focus-visible:ring-[#C9A84C]"
            />
          </div>
        )}

        {/* Grid granular */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="text-left text-[#6B7A8D] pb-3 font-medium w-40">Evento</th>
                {NOTIF_CHANNELS.map(ch => (
                  <th key={ch.key} className="text-center text-[#6B7A8D] pb-3 font-medium px-3">{ch.label}</th>
                ))}
              </tr>
            </thead>
            <tbody className="space-y-2">
              {NOTIF_EVENTS.map(ev => (
                <tr key={ev.key} className="border-t border-[#162236]">
                  <td className="py-2.5 text-[#A89880]">{ev.label}</td>
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
      <div className="bg-[#1A2B42] rounded-xl p-6 border border-[#162236] space-y-4">
        <h2 className="text-xs font-semibold text-[#A89880] uppercase tracking-widest">Planos e assinatura</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {PLANS.map(plan => (
            <div
              key={plan.name}
              className={`rounded-lg p-4 border transition-all ${
                plan.current
                  ? "border-[#C9A84C] bg-[#C9A84C]/10"
                  : "border-[#162236] bg-[#0D1B2A] hover:border-[#C9A84C]/30"
              }`}
            >
              <div className="flex justify-between items-start mb-1">
                <p className="font-semibold text-[#F0EBE3] text-sm">{plan.name}</p>
                {plan.current && (
                  <span className="text-xs px-1.5 py-0.5 rounded bg-[#C9A84C]/20 text-[#C9A84C] font-medium">Atual</span>
                )}
              </div>
              <p className="text-[#C9A84C] font-bold text-base mb-1">{plan.price}</p>
              <p className="text-xs text-[#6B7A8D]">{plan.desc}</p>
              {!plan.current && (
                <button className="mt-3 text-xs text-[#C9A84C] hover:underline font-medium">
                  {plan.name === "Personalizado" ? "Entrar em contato →" : "Fazer upgrade →"}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Extensão de navegador */}
      <div className="bg-[#1A2B42] rounded-xl p-6 border border-[#162236] space-y-4">
        <h2 className="text-xs font-semibold text-[#A89880] uppercase tracking-widest flex items-center gap-2">
          <Globe className="h-3.5 w-3.5" />
          Extensão de navegador
        </h2>
        <p className="text-sm text-[#A89880]">
          Adicione tarefas ao Audaz LifeHub diretamente do seu navegador, sem sair da página.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a
            href="https://chrome.google.com/webstore/detail/audaz-lifehub"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0D1B2A] border border-[#1A2B42] text-[#F0EBE3] hover:border-[#C9A84C]/30 transition-all text-sm font-medium"
          >
            <Chrome className="h-4 w-4 text-[#C9A84C]" />
            Instalar no Chrome
          </a>
          <a
            href="https://addons.mozilla.org/firefox/addon/audaz-lifehub"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#0D1B2A] border border-[#1A2B42] text-[#F0EBE3] hover:border-[#C9A84C]/30 transition-all text-sm font-medium"
          >
            <Globe className="h-4 w-4 text-[#C9A84C]" />
            Instalar no Firefox
          </a>
        </div>
        <div className="flex items-center gap-3 p-3 bg-[#0D1B2A] rounded-lg border border-[#1A2B42]">
          <QrCode className="h-10 w-10 text-[#6B7A8D]" />
          <div>
            <p className="text-xs text-[#A89880] font-medium">QR Code para instalação</p>
            <p className="text-xs text-[#6B7A8D]">Aponte a câmera do celular para instalar rapidamente</p>
          </div>
        </div>
      </div>

      {/* Salvar */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateMe.isPending}
          className={`font-bold transition-colors ${saved ? "bg-[#38A169] hover:bg-[#48BB78] text-white" : "bg-[#C9A84C] hover:bg-[#E2C06E] text-[#0D1B2A]"}`}
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
      <div className="bg-[#1A2B42] rounded-xl p-6 border border-[#162236] space-y-4">
        <h2 className="text-xs font-semibold text-[#A89880] uppercase tracking-widest">Conta</h2>
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
