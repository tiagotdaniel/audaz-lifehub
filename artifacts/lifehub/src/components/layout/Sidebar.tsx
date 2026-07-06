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
  X
} from "lucide-react";
import { useClerk, useUser } from "@clerk/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/hoje", icon: Sun, label: "Hoje" },
  { href: "/tasks", icon: ListTodo, label: "Todas Tarefas" },
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
  const [open, setOpen] = useState(false);

  const NavLinks = () => (
    <nav className="flex-1 space-y-1 py-4">
      {navItems.map((item) => {
        const isActive = location === item.href;
        return (
          <Link key={item.href} href={item.href}>
            <div
              className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors border-l-2 ${
                isActive
                  ? "bg-[#1A2B42] text-[#C9A84C] border-[#C9A84C]"
                  : "text-[#A89880] border-transparent hover:bg-[#162236] hover:text-[#F0EBE3]"
              }`}
              onClick={() => setOpen(false)}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              <span className="font-medium">{item.label}</span>
            </div>
          </Link>
        );
      })}
    </nav>
  );

  const UserProfile = () => (
    <div className="p-4 border-t border-[#1A2B42] bg-[#0D1B2A]">
      <div className="flex items-center gap-3 mb-4">
        <Avatar className="h-10 w-10 border border-[#162236]">
          <AvatarImage src={user?.imageUrl} />
          <AvatarFallback className="bg-[#1A2B42] text-[#C9A84C]">
            {user?.firstName?.charAt(0) || "U"}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#F0EBE3] truncate">
            {user?.fullName || user?.primaryEmailAddress?.emailAddress}
          </p>
          <p className="text-xs text-[#6B7A8D] truncate">
            {user?.primaryEmailAddress?.emailAddress}
          </p>
        </div>
      </div>
      <Button
        variant="outline"
        className="w-full justify-start text-[#A89880] border-[#162236] hover:bg-[#1A2B42] hover:text-[#E53E3E]"
        onClick={() => signOut({ redirectUrl: "/" })}
      >
        Sair
      </Button>
    </div>
  );

  const Logo = () => (
    <div className="p-6">
      <Link href="/dashboard" className="flex items-center gap-3 cursor-pointer">
        <img src="/logo.svg" alt="Audaz Logo" className="h-8 w-8" />
        <h1 className="font-serif text-2xl font-bold text-[#C9A84C] tracking-tight">
          Audaz LifeHub
        </h1>
      </Link>
    </div>
  );

  return (
    <>
      {/* Mobile Trigger */}
      <div className="md:hidden fixed top-0 left-0 p-4 z-50">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="bg-[#162236] border-[#1A2B42] text-[#C9A84C]">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-0 bg-[#162236] border-r border-[#1A2B42] flex flex-col">
            <Logo />
            <div className="flex-1 overflow-y-auto custom-scrollbar">
              <NavLinks />
            </div>
            <UserProfile />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden md:flex w-64 bg-[#162236] border-r border-[#1A2B42] flex-col shrink-0">
        <Logo />
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <NavLinks />
        </div>
        <UserProfile />
      </div>
    </>
  );
}
