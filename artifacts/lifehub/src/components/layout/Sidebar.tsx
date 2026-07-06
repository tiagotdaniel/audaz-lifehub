import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  ListTodo,
  Sun,
  CalendarDays,
  Activity,
  CheckCircle2,
  Target,
  Briefcase,
  Settings,
  Menu,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useClerk, useUser } from "@clerk/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/hoje", icon: Sun, label: "Hoje" },
  { href: "/tasks", icon: ListTodo, label: "Todas as Tarefas" },
  { href: "/planejamento", icon: CalendarDays, label: "Planejamento" },
  { href: "/projetos", icon: Briefcase, label: "Projetos" },
  { href: "/metas", icon: Target, label: "Metas" },
  { href: "/anual", icon: Activity, label: "Visão Anual" },
  { href: "/concluidas", icon: CheckCircle2, label: "Concluídas" },
  { href: "/configuracoes", icon: Settings, label: "Configurações" },
];

export default function Sidebar() {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("sidebar-collapsed", String(collapsed)); } catch { /* noop */ }
  }, [collapsed]);

  const NavLinks = ({ inSheet = false }: { inSheet?: boolean }) => (
    <nav className="flex-1 space-y-0.5 py-4">
      {navItems.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <div
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-all duration-200 border-l-2 ${
                isActive
                  ? "bg-[#1A2B42] text-[#C9A84C] border-[#C9A84C]"
                  : "text-[#A89880] border-transparent hover:bg-[#162236] hover:text-[#F0EBE3]"
              } ${collapsed && !inSheet ? "px-3 justify-center" : ""}`}
              onClick={() => setMobileOpen(false)}
              title={collapsed && !inSheet ? item.label : undefined}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {(!collapsed || inSheet) && (
                <span className="font-medium text-sm">{item.label}</span>
              )}
            </div>
          </Link>
        );
      })}
    </nav>
  );

  const UserProfile = ({ inSheet = false }: { inSheet?: boolean }) => (
    <div className={`p-4 border-t border-[#1A2B42] bg-[#0D1B2A] ${collapsed && !inSheet ? "flex justify-center" : ""}`}>
      {(!collapsed || inSheet) ? (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border border-[#162236] shrink-0">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback className="bg-[#1A2B42] text-[#C9A84C] text-xs">
              {user?.firstName?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-[#F0EBE3] truncate">
              {user?.fullName || user?.primaryEmailAddress?.emailAddress}
            </p>
            <button
              onClick={() => signOut({ redirectUrl: "/" })}
              className="text-xs text-[#6B7A8D] hover:text-[#E53E3E] transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      ) : (
        <Avatar
          className="h-8 w-8 border border-[#162236] cursor-pointer"
          title={user?.fullName || "Perfil"}
        >
          <AvatarImage src={user?.imageUrl} />
          <AvatarFallback className="bg-[#1A2B42] text-[#C9A84C] text-xs">
            {user?.firstName?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );

  const Logo = ({ inSheet = false }: { inSheet?: boolean }) => (
    <div className={`p-4 border-b border-[#1A2B42] ${collapsed && !inSheet ? "flex justify-center" : ""}`}>
      <Link href="/dashboard" className="flex items-center gap-3 cursor-pointer">
        <img src="/logo.svg" alt="Audaz Logo" className="h-7 w-7 shrink-0" />
        {(!collapsed || inSheet) && (
          <h1 className="font-serif text-xl font-bold text-[#C9A84C] tracking-tight">
            Audaz LifeHub
          </h1>
        )}
      </Link>
    </div>
  );

  const CollapseToggle = () => (
    <button
      onClick={() => setCollapsed(c => !c)}
      className="flex items-center justify-center w-full py-2 text-[#6B7A8D] hover:text-[#C9A84C] hover:bg-[#1A2B42] transition-colors border-t border-[#1A2B42]"
      title={collapsed ? "Expandir sidebar" : "Recolher sidebar"}
    >
      {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
    </button>
  );

  return (
    <>
      {/* Mobile trigger */}
      <div className="md:hidden fixed top-0 left-0 p-4 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="bg-[#162236] border border-[#1A2B42] text-[#C9A84C]">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-[#162236] border-r border-[#1A2B42] flex flex-col">
            <Logo inSheet />
            <div className="flex-1 overflow-y-auto">
              <NavLinks inSheet />
            </div>
            <UserProfile inSheet />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <div
        className="hidden md:flex flex-col bg-[#162236] border-r border-[#1A2B42] shrink-0 transition-all duration-250"
        style={{ width: collapsed ? 52 : 220 }}
      >
        <Logo />
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <UserProfile />
        <CollapseToggle />
      </div>
    </>
  );
}
