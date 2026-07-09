import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, ListTodo, Sun, CalendarDays, Activity,
  CheckCircle2, Target, Briefcase, Settings, Menu,
  ChevronLeft, ChevronRight, Plus, List, DollarSign,
  Dumbbell, Image, FileText, AlertTriangle, Star,
  Moon, Monitor,
} from "lucide-react";
import { useClerk, useUser } from "@clerk/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/context/ThemeContext";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/hoje", icon: Sun, label: "Hoje" },
  { href: "/tasks", icon: ListTodo, label: "Todas as Tarefas" },
  { href: "/atrasadas", icon: AlertTriangle, label: "Atrasadas", badge: "red" },
  { href: "/planejamento", icon: CalendarDays, label: "Planejamento" },
  { href: "/projetos", icon: Briefcase, label: "Projetos" },
  { href: "/metas", icon: Target, label: "Metas" },
  { href: "/listas", icon: List, label: "Listas" },
  { href: "/financas", icon: DollarSign, label: "Finanças" },
  { href: "/shape", icon: Dumbbell, label: "Shape" },
  { href: "/mural", icon: Image, label: "Mural dos Sonhos" },
  { href: "/documentos", icon: FileText, label: "Documentos" },
  { href: "/anual", icon: Activity, label: "Visão Anual" },
  { href: "/concluidas", icon: CheckCircle2, label: "Concluídas" },
  { href: "/configuracoes", icon: Settings, label: "Configurações" },
];

const THEME_ICONS = {
  dark: Moon,
  light: Sun,
  auto: Monitor,
};

interface SidebarContentProps {
  onItemClick?: () => void;
  inSheet?: boolean;
  collapsed?: boolean;
}

function SidebarContent({ onItemClick, inSheet = false, collapsed = false }: SidebarContentProps) {
  const [location] = useLocation();
  const { signOut } = useClerk();
  const { user } = useUser();
  const { theme, setTheme } = useTheme();

  const ThemeIcon = THEME_ICONS[theme];
  const nextTheme = theme === "dark" ? "light" : theme === "light" ? "auto" : "dark";
  const themeLabel = { dark: "Escuro", light: "Claro", auto: "Automático" }[theme];

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`border-b border-[#1A2B42] ${collapsed && !inSheet ? "flex justify-center p-3" : "p-4"}`}>
        <Link href="/dashboard" className={`flex items-center gap-3 cursor-pointer ${collapsed && !inSheet ? "" : ""}`}>
          <img src="/logo.svg" alt="Audaz" className="h-7 w-7 shrink-0" />
          {(!collapsed || inSheet) && (
            <h1 className="font-serif text-xl font-bold text-[#C9A84C] tracking-tight">Audaz LifeHub</h1>
          )}
        </Link>
      </div>

      {/* +Add Task quick button */}
      <div className={`p-2 border-b border-[#1A2B42] ${collapsed && !inSheet ? "flex justify-center" : ""}`}>
        {(!collapsed || inSheet) ? (
          <Link href="/tasks?new=1">
            <button
              onClick={onItemClick}
              className="btn-gold w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[#0D1B2A] font-bold text-sm"
            >
              <Plus className="h-4 w-4 shrink-0" />
              + Adicionar tarefa
            </button>
          </Link>
        ) : (
          <Link href="/tasks?new=1">
            <button className="btn-gold w-9 h-9 rounded-lg flex items-center justify-center text-[#0D1B2A] font-bold" title="+ Adicionar tarefa">
              <Plus className="h-4 w-4" />
            </button>
          </Link>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href}>
              <div
                onClick={onItemClick}
                className={`flex items-center gap-3 py-2.5 cursor-pointer transition-all border-l-2 ${
                  isActive
                    ? "bg-[#1A2B42] text-[#C9A84C] border-[#C9A84C]"
                    : "text-[#A89880] border-transparent hover:bg-[#162236] hover:text-[#F0EBE3]"
                } ${collapsed && !inSheet ? "px-3 justify-center" : "px-4"}`}
                title={collapsed && !inSheet ? item.label : undefined}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {(!collapsed || inSheet) && (
                  <span className="font-medium text-sm flex-1">{item.label}</span>
                )}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className={`border-t border-[#1A2B42] ${collapsed && !inSheet ? "flex justify-center p-2" : "p-3"}`}>
        <button
          onClick={() => setTheme(nextTheme)}
          className={`flex items-center gap-2 rounded-lg bg-[#1A2B42] text-[#A89880] hover:text-[#C9A84C] transition-colors text-xs font-medium ${collapsed && !inSheet ? "w-9 h-9 justify-center" : "w-full px-3 py-2"}`}
          title={`Tema: ${themeLabel}`}
        >
          <ThemeIcon className="h-4 w-4 shrink-0" />
          {(!collapsed || inSheet) && themeLabel}
        </button>
      </div>

      {/* User profile */}
      <div className={`p-3 border-t border-[#1A2B42] bg-[#0D1B2A] ${collapsed && !inSheet ? "flex justify-center" : ""}`}>
        {(!collapsed || inSheet) ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0 border border-[#162236]">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="bg-[#1A2B42] text-[#C9A84C] text-xs">
                {user?.firstName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[#F0EBE3] truncate">
                {user?.fullName || user?.primaryEmailAddress?.emailAddress}
              </p>
              <button onClick={() => signOut({ redirectUrl: "/" })} className="text-xs text-[#6B7A8D] hover:text-[#E53E3E] transition-colors">
                Sair
              </button>
            </div>
          </div>
        ) : (
          <Avatar className="h-8 w-8 border border-[#162236] cursor-pointer" title={user?.fullName || "Perfil"}>
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback className="bg-[#1A2B42] text-[#C9A84C] text-xs">
              {user?.firstName?.charAt(0) || "U"}
            </AvatarFallback>
          </Avatar>
        )}
      </div>
    </div>
  );
}

export default function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem("sidebar-collapsed") === "true"; } catch { return false; }
  });

  useEffect(() => {
    try { localStorage.setItem("sidebar-collapsed", String(collapsed)); } catch { /* noop */ }
  }, [collapsed]);

  return (
    <>
      {/* Mobile trigger */}
      <div className="md:hidden fixed top-0 left-0 p-3 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="bg-[#162236] border border-[#1A2B42] text-[#C9A84C] h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-[#162236] border-r border-[#1A2B42]">
            <SidebarContent inSheet onItemClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <div
        className="hidden md:flex flex-col bg-[#162236] border-r border-[#1A2B42] shrink-0 transition-all duration-250 relative"
        style={{ width: collapsed ? 52 : 224 }}
      >
        <SidebarContent collapsed={collapsed} />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[#1A2B42] border border-[#162236] text-[#6B7A8D] hover:text-[#C9A84C] shadow-md transition-colors"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </div>
    </>
  );
}
