import { Link, useLocation } from "wouter";
import {
  LayoutDashboard, ListTodo, Sun, CalendarDays, Activity,
  CheckCircle2, Target, Briefcase, Settings, Menu,
  ChevronLeft, ChevronRight, Plus, List, DollarSign,
  Dumbbell, Image, FileText, Star,
  Moon, Monitor, GripVertical,
} from "lucide-react";
import { useClerk, useUser } from "@clerk/react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useTheme } from "@/context/ThemeContext";
import { OPEN_QUICKADD_EVENT } from "@/App";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/hoje", icon: Sun, label: "Hoje" },
  { href: "/tasks", icon: ListTodo, label: "Todas as Tarefas" },
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

const NAV_ORDER_KEY = "sidebar-nav-order";

function useOrderedNavItems() {
  const [order, setOrder] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem(NAV_ORDER_KEY);
      if (stored) return JSON.parse(stored);
    } catch { /* noop */ }
    return navItems.map((i) => i.href);
  });

  useEffect(() => {
    try { localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(order)); } catch { /* noop */ }
  }, [order]);

  const items = order
    .map((href) => navItems.find((i) => i.href === href))
    .filter((i): i is (typeof navItems)[number] => !!i)
    .concat(navItems.filter((i) => !order.includes(i.href)));

  const reorder = (fromHref: string, toHref: string) => {
    if (fromHref === toHref) return;
    setOrder((prev) => {
      const list = prev.includes(fromHref) ? [...prev] : [...prev, fromHref];
      const from = list.indexOf(fromHref);
      const to = list.indexOf(toHref);
      list.splice(from, 1);
      list.splice(to, 0, fromHref);
      return list;
    });
  };

  return { items, reorder };
}

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
  const { items: orderedNavItems, reorder } = useOrderedNavItems();
  const [draggedHref, setDraggedHref] = useState<string | null>(null);

  const ThemeIcon = THEME_ICONS[theme];
  const nextTheme = theme === "dark" ? "light" : theme === "light" ? "auto" : "dark";
  const themeLabel = { dark: "Escuro", light: "Claro", auto: "Automático" }[theme];

  return (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={`border-b border-[var(--surface-2)] ${collapsed && !inSheet ? "flex justify-center p-3" : "p-4"}`}>
        <Link href="/dashboard" className={`flex items-center gap-3 cursor-pointer ${collapsed && !inSheet ? "" : ""}`}>
          <img src="/logo.svg" alt="Audaz" className="h-7 w-7 shrink-0" />
          {(!collapsed || inSheet) && (
            <h1 className="font-serif text-xl font-bold text-[#C9A84C] tracking-tight gold-glow">Audaz LifeHub</h1>
          )}
        </Link>
      </div>

      {/* +Add Task quick button */}
      <div className={`p-2 border-b border-[var(--surface-2)] ${collapsed && !inSheet ? "flex justify-center" : ""}`}>
        {(!collapsed || inSheet) ? (
          <button
            onClick={() => { window.dispatchEvent(new Event(OPEN_QUICKADD_EVENT)); onItemClick?.(); }}
            className="btn-gold w-full flex items-center gap-2 px-3 py-2 rounded-lg text-[var(--surface-0)] font-bold text-sm"
          >
            <Plus className="h-4 w-4 shrink-0" />
            + Adicionar tarefa
          </button>
        ) : (
          <button
            onClick={() => window.dispatchEvent(new Event(OPEN_QUICKADD_EVENT))}
            className="btn-gold w-9 h-9 rounded-lg flex items-center justify-center text-[var(--surface-0)] font-bold"
            title="+ Adicionar tarefa (Ctrl/Cmd+T)"
          >
            <Plus className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-2">
        {orderedNavItems.map((item) => {
          const isActive = location === item.href;
          const draggable = !collapsed || inSheet;
          return (
            <div
              key={item.href}
              draggable={draggable}
              onDragStart={() => setDraggedHref(item.href)}
              onDragOver={(e) => { if (draggable) e.preventDefault(); }}
              onDrop={(e) => {
                e.preventDefault();
                if (draggedHref) reorder(draggedHref, item.href);
                setDraggedHref(null);
              }}
              onDragEnd={() => setDraggedHref(null)}
              className={draggedHref === item.href ? "opacity-40" : ""}
            >
              <Link href={item.href}>
                <div
                  onClick={onItemClick}
                  className={`flex items-center gap-2 py-2.5 cursor-pointer transition-all border-l-2 ${
                    isActive
                      ? "bg-[var(--surface-2)] text-[#C9A84C] border-[#C9A84C]"
                      : "text-[var(--text-muted)] border-transparent hover:bg-[var(--surface-1)] hover:text-[var(--text-primary)]"
                  } ${collapsed && !inSheet ? "px-3 justify-center" : "px-3"}`}
                  title={collapsed && !inSheet ? item.label : undefined}
                >
                  {draggable && (
                    <GripVertical className="h-3.5 w-3.5 shrink-0 text-[var(--text-subtle)]/50 cursor-grab" />
                  )}
                  <item.icon className={`h-5 w-5 shrink-0 ${isActive ? "gold-glow-icon" : ""}`} />
                  {(!collapsed || inSheet) && (
                    <span className={`font-medium text-sm flex-1 ${isActive ? "gold-glow" : ""}`}>{item.label}</span>
                  )}
                </div>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Theme toggle */}
      <div className={`border-t border-[var(--surface-2)] ${collapsed && !inSheet ? "flex justify-center p-2" : "p-3"}`}>
        <button
          onClick={() => setTheme(nextTheme)}
          className={`flex items-center gap-2 rounded-lg bg-[var(--surface-2)] text-[var(--text-muted)] hover:text-[#C9A84C] transition-colors text-xs font-medium ${collapsed && !inSheet ? "w-9 h-9 justify-center" : "w-full px-3 py-2"}`}
          title={`Tema: ${themeLabel}`}
        >
          <ThemeIcon className="h-4 w-4 shrink-0" />
          {(!collapsed || inSheet) && themeLabel}
        </button>
      </div>

      {/* User profile */}
      <div className={`p-3 border-t border-[var(--surface-2)] bg-[var(--surface-0)] ${collapsed && !inSheet ? "flex justify-center" : ""}`}>
        {(!collapsed || inSheet) ? (
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8 shrink-0 border border-[var(--surface-1)]">
              <AvatarImage src={user?.imageUrl} />
              <AvatarFallback className="bg-[var(--surface-2)] text-[#C9A84C] text-xs">
                {user?.firstName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--text-primary)] truncate">
                {user?.fullName || user?.primaryEmailAddress?.emailAddress}
              </p>
              <button onClick={() => signOut({ redirectUrl: "/" })} className="text-xs text-[var(--text-subtle)] hover:text-[#E53E3E] transition-colors">
                Sair
              </button>
            </div>
          </div>
        ) : (
          <Avatar className="h-8 w-8 border border-[var(--surface-1)] cursor-pointer" title={user?.fullName || "Perfil"}>
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback className="bg-[var(--surface-2)] text-[#C9A84C] text-xs">
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
            <Button variant="ghost" size="icon" className="bg-[var(--surface-1)] border border-[var(--surface-2)] text-[#C9A84C] h-9 w-9">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-[var(--surface-1)] border-r border-[var(--surface-2)]">
            <SidebarContent inSheet onItemClick={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <div
        className="hidden md:flex flex-col bg-[var(--surface-1)] border-r border-[var(--surface-2)] shrink-0 transition-all duration-250 relative"
        style={{ width: collapsed ? 52 : 224 }}
      >
        <SidebarContent collapsed={collapsed} />
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(c => !c)}
          className="absolute -right-3 top-20 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-[var(--surface-2)] border border-[var(--surface-1)] text-[var(--text-subtle)] hover:text-[#C9A84C] shadow-md transition-colors"
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </div>
    </>
  );
}
