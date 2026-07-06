import { ReactNode } from "react";
import Sidebar from "./Sidebar";
import QuickAdd from "../tasks/QuickAdd";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-[100dvh] bg-[#0D1B2A] text-[#F0EBE3] overflow-hidden font-sans dark">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex-none p-4 border-b border-[#162236] bg-[#0D1B2A] z-10">
          <QuickAdd />
        </div>
        <div className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-5xl mx-auto w-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
