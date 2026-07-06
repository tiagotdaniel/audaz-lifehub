export default function Landing() {
  return (
    <div className="min-h-[100dvh] bg-[#0D1B2A] flex flex-col">
      <header className="p-6 border-b border-[#162236] flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="Audaz Logo" className="h-8 w-8" />
          <h1 className="font-serif text-2xl font-bold text-[#C9A84C] tracking-tight">
            Audaz LifeHub
          </h1>
        </div>
      </header>
      <main className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <h2 className="text-4xl md:text-6xl font-serif font-bold text-[#F0EBE3] mb-6 max-w-3xl">
          Seu centro de comando pessoal para alta performance.
        </h2>
        <p className="text-lg md:text-xl text-[#A89880] mb-10 max-w-2xl">
          Domine seu tempo, organize seus projetos e atinja suas metas. Um sistema denso, focado e poderoso.
        </p>
        <div className="flex flex-col sm:flex-row gap-4">
          <a href="/sign-in" className="px-8 py-4 bg-[#C9A84C] text-[#0D1B2A] font-bold rounded-lg hover:bg-[#E2C06E] transition-colors text-lg">
            Entrar
          </a>
          <a href="/sign-up" className="px-8 py-4 bg-[#162236] text-[#C9A84C] font-bold rounded-lg border border-[#C9A84C] hover:bg-[#1A2B42] transition-colors text-lg">
            Criar Conta
          </a>
        </div>
      </main>
    </div>
  );
}
