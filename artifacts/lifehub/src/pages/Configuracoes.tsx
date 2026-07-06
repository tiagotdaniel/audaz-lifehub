import { useState, useEffect } from "react";
import { useGetMe, useUpdateMe, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useUser, useClerk } from "@clerk/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { LogOut, Save } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Configuracoes() {
  const qc = useQueryClient();
  const { user } = useUser();
  const { signOut } = useClerk();
  const { data: me } = useGetMe();
  const updateMe = useUpdateMe();

  const [whatsapp, setWhatsapp] = useState("");
  const [notifPush, setNotifPush] = useState(true);
  const [notifWhatsapp, setNotifWhatsapp] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (me) {
      setWhatsapp(me.whatsappNumber ?? "");
      const prefs = me.notifPrefs as { push: boolean; whatsapp: boolean } | null;
      if (prefs) {
        setNotifPush(prefs.push ?? true);
        setNotifWhatsapp(prefs.whatsapp ?? false);
      }
    }
  }, [me]);

  const handleSave = () => {
    updateMe.mutate({
      data: {
        whatsappNumber: whatsapp || undefined,
        notifPrefs: { push: notifPush, whatsapp: notifWhatsapp },
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
        <h1 className="text-3xl font-serif font-bold text-[#F0EBE3] mb-1">Configuracoes</h1>
        <p className="text-[#A89880] text-sm">Gerencie sua conta e preferencias</p>
      </div>

      {/* Profile */}
      <div className="bg-[#1A2B42] rounded-xl p-6 border border-[#162236] space-y-6">
        <h2 className="text-sm font-semibold text-[#A89880] uppercase tracking-widest">Perfil</h2>
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

      {/* Notifications */}
      <div className="bg-[#1A2B42] rounded-xl p-6 border border-[#162236] space-y-6">
        <h2 className="text-sm font-semibold text-[#A89880] uppercase tracking-widest">Notificacoes</h2>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[#F0EBE3] font-medium">Notificacoes push</p>
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
            <label className="text-xs text-[#6B7A8D] mb-1.5 block">Numero do WhatsApp</label>
            <Input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="+55 11 99999-9999"
              className="bg-[#0D1B2A] border-[#1A2B42] text-[#F0EBE3] placeholder:text-[#6B7A8D] focus-visible:ring-[#C9A84C]"
            />
          </div>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleSave}
            disabled={updateMe.isPending}
            className={`font-bold transition-colors ${saved ? "bg-[#38A169] hover:bg-[#48BB78] text-white" : "bg-[#C9A84C] hover:bg-[#E2C06E] text-[#0D1B2A]"}`}
          >
            {saved ? (
              <>Salvo!</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Account */}
      <div className="bg-[#1A2B42] rounded-xl p-6 border border-[#162236] space-y-4">
        <h2 className="text-sm font-semibold text-[#A89880] uppercase tracking-widest">Conta</h2>
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
